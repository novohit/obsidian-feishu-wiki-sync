/**
 * 飞书文档（Docx）Block API 封装
 *
 * 功能：
 * - 获取文档信息（含当前 revision_id）
 * - 清空文档内容
 * - 批量写入 Block
 *
 * 核心设计决策：直接用 Block API 构建文档，而非 import .md 文件
 * 原因：FeishuShare 的 import-then-patch 方式在更新时会丢失嵌套列表等内容
 */

import { requestUrl } from "obsidian";
import {
  FeishuResponse,
  DocxDocument,
  DocxBlock,
  CreateBlockChildrenRequest,
} from "./types";
import { FeishuAuth } from "./auth";
import { RateLimiter } from "./rate-limiter";

const API_BASE = "https://open.feishu.cn/open-apis";
/** 每次批量插入的最大 block 数量 */
const BATCH_SIZE = 50;

export class DocApi {
  constructor(private auth: FeishuAuth, private rateLimiter: RateLimiter) {}

  /**
   * 获取文档基本信息（包含 revision_id，写入时需要）
   *
   * 输入参数：
   * - documentId: 文档 ID（即 obj_token）
   *
   * 返回值：文档信息
   */
  async getDocument(documentId: string): Promise<DocxDocument> {
    const token = await this.auth.getToken();
    const resp = await requestUrl({
      url: `${API_BASE}/docx/v1/documents/${documentId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      throw: false,
    });

    const data: FeishuResponse<{ document: DocxDocument }> = resp.json;
    if (data.code !== 0) {
      throw new Error(`获取文档信息失败 (${data.code}): ${data.msg}`);
    }

    return data.data.document;
  }

  /**
   * 获取文档下的所有直接子 Block ID 列表
   *
   * 用于更新前先清空旧内容
   *
   * 输入参数：
   * - documentId: 文档 ID
   *
   * 返回值：Block ID 数组
   */
  async listRootBlockIds(documentId: string): Promise<string[]> {
    const token = await this.auth.getToken();
    const blockIds: string[] = [];
    let pageToken = "";

    do {
      const params = new URLSearchParams({ page_size: "200" });
      if (pageToken) params.set("page_token", pageToken);

      // 根 block 的 ID 与文档 ID 相同
      const resp = await requestUrl({
        url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${documentId}/children?${params.toString()}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        throw: false,
      });

      const data: FeishuResponse<{ items?: DocxBlock[]; has_more?: boolean; page_token?: string }> =
        resp.json;
      if (data.code !== 0) {
        throw new Error(`获取文档块列表失败 (${data.code}): ${data.msg}`);
      }

      blockIds.push(
        ...(data.data?.items ?? [])
          .map((b) => b.block_id)
          .filter((id): id is string => !!id)
      );
      pageToken = data.data?.has_more ? data.data.page_token ?? "" : "";
    } while (pageToken);

    return blockIds;
  }

  /**
   * 批量删除文档根节点下的所有子 Block
   *
   * 使用飞书 batch_delete API 逐个删除（从后向前，避免索引偏移）
   *
   * 输入参数：
   * - documentId: 文档 ID
   * - blockIds: 要删除的 Block ID 列表
   * - startRevision: 当前文档版本号
   *
   * 返回值：删除后的最新 revision_id
   */
  async deleteBlocks(
    documentId: string,
    blockIds: string[],
    startRevision: number
  ): Promise<number> {
    if (blockIds.length === 0) return startRevision;
    const token = await this.auth.getToken();
    let currentRevision = startRevision;

    // 从后往前逐个删除，避免索引变化问题
    for (let i = blockIds.length - 1; i >= 0; i--) {
      await this.rateLimiter.acquire("doc");

      const resp = await requestUrl({
        url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${blockIds[i]}/children/batch_delete`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          start_index: 0,
          end_index: 1,
          document_revision_id: currentRevision,
        }),
        throw: false,
      });

      const data: FeishuResponse<{ document_revision_id?: number }> = resp.json;
      // 忽略 "block not found" 之类的错误
      if (data.code === 0 && data.data?.document_revision_id) {
        currentRevision = data.data.document_revision_id;
      }
    }

    return currentRevision;
  }

  /**
   * 向文档根节点批量写入 Block（分批，每批最多 50 个）
   *
   * 输入参数：
   * - documentId: 文档 ID（同时也是根 Block ID）
   * - blocks: 要插入的 Block 数组
   * - revisionId: 当前文档版本号（防冲突）
   */
  async appendBlocks(
    documentId: string,
    blocks: DocxBlock[],
    revisionId: number
  ): Promise<void> {
    if (blocks.length === 0) return;
    const token = await this.auth.getToken();

    let currentRevision = revisionId;
    let insertIndex = 0;

    for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
      await this.rateLimiter.acquire("doc");
      const batch = blocks.slice(i, i + BATCH_SIZE);

      const body: CreateBlockChildrenRequest = {
        children: batch,
        index: insertIndex,
        document_revision_id: currentRevision,
      };

      const resp = await requestUrl({
        url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(body),
        throw: false,
      });

      const data: FeishuResponse<{ children?: DocxBlock[]; document_revision_id?: number }> =
        resp.json;
      if (data.code !== 0) {
        throw new Error(`写入文档块失败 (${data.code}): ${data.msg}`);
      }

      // 使用服务端返回的最新 revision_id，避免后续批次冲突
      if (data.data?.document_revision_id) {
        currentRevision = data.data.document_revision_id;
      }
      insertIndex += batch.length;
    }
  }

  /**
   * 覆盖写入文档内容（先清空再写入）
   *
   * 输入参数：
   * - documentId: 文档 ID
   * - blocks: 新的 Block 内容数组
   */
  /**
   * 向文档写入内容
   *
   * 逻辑：
   * - 如果文档没有子块（新建文档），直接 append
   * - 如果有子块（更新），先删除再 append
   *
   * 输入参数：
   * - documentId: 文档 ID
   * - blocks: 新的 Block 内容数组
   */
  async overwriteDocument(documentId: string, blocks: DocxBlock[]): Promise<void> {
    if (blocks.length === 0) return;

    // 获取当前版本信息
    const doc = await this.getDocument(documentId);
    let currentRevision = doc.revision_id;

    // 获取现有子块
    const existingBlockIds = await this.listRootBlockIds(documentId);

    // 如果有现有内容，逐个删除（用文档根 block 的 children batch_delete）
    if (existingBlockIds.length > 0) {
      // 用更简单的方式：直接删除根块的所有 children
      let deleted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        await this.rateLimiter.acquire("doc");
        const token = await this.auth.getToken();

        const resp = await requestUrl({
          url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${documentId}/children/batch_delete`,
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify({
            start_index: 0,
            end_index: existingBlockIds.length,
            document_revision_id: currentRevision,
          }),
          throw: false,
        });

        const data: FeishuResponse<{ document_revision_id?: number }> = resp.json;
        if (data.code === 0) {
          if (data.data?.document_revision_id) {
            currentRevision = data.data.document_revision_id;
          }
          deleted = true;
          break;
        }
        // revision 冲突则重新获取
        const freshDoc = await this.getDocument(documentId);
        currentRevision = freshDoc.revision_id;
      }

      if (!deleted) {
        throw new Error("清空飞书文档旧内容失败，已停止写入以避免新旧内容混合");
      }
    }

    // 写入新内容
    await this.appendBlocks(documentId, blocks, currentRevision);
  }
}
