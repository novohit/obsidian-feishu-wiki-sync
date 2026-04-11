/**
 * 飞书知识库（Wiki）API 封装
 *
 * 功能：
 * - 获取知识空间列表
 * - 获取节点列表（支持翻页）
 * - 创建知识库节点（文档类型）
 */

import { requestUrl } from "obsidian";
import {
  FeishuResponse,
  WikiSpace,
  WikiNode,
  WikiNodeListResponse,
  CreateWikiNodeRequest,
  CreateWikiNodeResponse,
} from "./types";
import { FeishuAuth } from "./auth";
import { RateLimiter } from "./rate-limiter";

const API_BASE = "https://open.feishu.cn/open-apis";

export class WikiApi {
  constructor(private auth: FeishuAuth, private rateLimiter: RateLimiter) {}

  /**
   * 获取当前应用可访问的知识空间列表
   *
   * 返回值：知识空间数组
   */
  async listSpaces(): Promise<WikiSpace[]> {
    const token = await this.auth.getToken();
    const resp = await requestUrl({
      url: `${API_BASE}/wiki/v2/spaces?page_size=50`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      throw: false,
    });

    const data: FeishuResponse<{ items: WikiSpace[] }> = resp.json;
    if (data.code !== 0) {
      throw new Error(`获取知识空间列表失败 (${data.code}): ${data.msg}`);
    }

    return data.data?.items ?? [];
  }

  /**
   * 获取指定知识空间下的节点列表（支持分页，一次性加载全部）
   *
   * 输入参数：
   * - spaceId: 知识空间 ID
   * - parentNodeToken: 父节点 token，不传则获取根节点列表
   *
   * 返回值：节点数组
   */
  async listNodes(spaceId: string, parentNodeToken?: string): Promise<WikiNode[]> {
    const token = await this.auth.getToken();
    const allNodes: WikiNode[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams({ page_size: "50" });
      if (parentNodeToken) params.set("parent_node_token", parentNodeToken);
      if (pageToken) params.set("page_token", pageToken);

      const resp = await requestUrl({
        url: `${API_BASE}/wiki/v2/spaces/${spaceId}/nodes?${params.toString()}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        throw: false,
      });

      const data: FeishuResponse<WikiNodeListResponse> = resp.json;
      if (data.code !== 0) {
        throw new Error(`获取节点列表失败 (${data.code}): ${data.msg}`);
      }

      allNodes.push(...(data.data?.items ?? []));
      pageToken = data.data?.has_more ? data.data.page_token : undefined;
    } while (pageToken);

    return allNodes;
  }

  /**
   * 在知识空间中创建一个文档节点
   *
   * 输入参数：
   * - spaceId: 目标知识空间 ID
   * - title: 节点标题
   * - parentNodeToken: 父节点 token（不传则创建在根部）
   *
   * 返回值：创建成功的节点信息
   */
  async createNode(
    spaceId: string,
    title: string,
    parentNodeToken?: string
  ): Promise<WikiNode> {
    await this.rateLimiter.acquire("wiki");
    const token = await this.auth.getToken();

    const body: CreateWikiNodeRequest = {
      obj_type: "docx",
      node_type: "origin",
      title,
    };
    if (parentNodeToken) body.parent_node_token = parentNodeToken;

    const resp = await requestUrl({
      url: `${API_BASE}/wiki/v2/spaces/${spaceId}/nodes`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
      throw: false,
    });

    const data: FeishuResponse<CreateWikiNodeResponse> = resp.json;
    if (data.code !== 0) {
      throw new Error(`创建知识库节点失败 (${data.code}): ${data.msg}`);
    }

    return data.data.node;
  }

  /**
   * 根据路径（空间ID + 父节点）查找同名节点，不存在则创建
   *
   * 用于批量同步时维护目录结构
   *
   * 输入参数：
   * - spaceId: 知识空间 ID
   * - title: 要查找/创建的节点标题
   * - parentNodeToken: 父节点 token
   *
   * 返回值：节点 token
   */
  async findOrCreateNode(
    spaceId: string,
    title: string,
    parentNodeToken?: string
  ): Promise<WikiNode> {
    // 先查找同名节点
    const existingNodes = await this.listNodes(spaceId, parentNodeToken);
    const found = existingNodes.find((n) => n.title === title);
    if (found) return found;

    // 不存在则新建
    return this.createNode(spaceId, title, parentNodeToken);
  }
}
