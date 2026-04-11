/**
 * 图片解析与上传器
 *
 * 功能：
 * - 识别图片来源（本地 vault 内文件 / 网络 URL）
 * - 读取图片二进制数据
 * - 调用 DriveApi 上传到飞书云盘
 * - 返回 file_token，供 Block 引用
 *
 * 运行方式：由 SyncEngine 在 Markdown 转换完成后调用，
 *           将 pendingImages 中的每张图片逐一处理
 */

import { requestUrl, Vault } from "obsidian";
import { DriveApi } from "../feishu/drive-api";

export class ImageResolver {
  constructor(private vault: Vault, private driveApi: DriveApi) {}

  /**
   * 处理单张图片，返回 file_token
   *
   * 输入参数：
   * - src: 图片路径（本地相对路径 或 网络 URL）
   * - documentId: 所属文档 ID（飞书上传时需要）
   * - sourceFilePath: 笔记文件所在路径（用于解析相对路径）
   *
   * 返回值：成功返回 file_token；失败返回 null（不中断整体同步）
   */
  async resolveAndUpload(
    src: string,
    documentId: string,
    sourceFilePath: string
  ): Promise<string | null> {
    try {
      const { data, fileName } = await this.readImage(src, sourceFilePath);
      if (!data) return null;
      return await this.driveApi.uploadImage(fileName, data, documentId);
    } catch (err) {
      console.warn(`[FeishuWiki] 图片上传失败 "${src}":`, err);
      return null;
    }
  }

  /**
   * 读取图片数据
   *
   * 输入参数：
   * - src: 图片路径或 URL
   * - sourceFilePath: 笔记文件路径（用于解析相对路径）
   *
   * 返回值：{ data: ArrayBuffer, fileName: string }
   */
  private async readImage(
    src: string,
    sourceFilePath: string
  ): Promise<{ data: ArrayBuffer | null; fileName: string }> {
    const fileName = src.split("/").pop() ?? "image.png";

    // 网络图片
    if (src.startsWith("http://") || src.startsWith("https://")) {
      const resp = await requestUrl({ url: src, method: "GET", throw: false });
      if (resp.status !== 200) {
        throw new Error(`网络图片下载失败 (HTTP ${resp.status}): ${src}`);
      }
      return { data: resp.arrayBuffer, fileName };
    }

    // 本地图片：先尝试相对路径，再尝试 vault 全局搜索
    const sourceDir = sourceFilePath.split("/").slice(0, -1).join("/");
    const candidates = [
      src,
      `${sourceDir}/${src}`,
      decodeURIComponent(src),
    ];

    for (const candidate of candidates) {
      if (await this.vault.adapter.exists(candidate)) {
        const data = await this.vault.adapter.readBinary(candidate);
        return { data, fileName };
      }
    }

    // 使用 Obsidian 的文件解析（处理 [[wikilink]] 格式的图片路径）
    const file = this.vault.getFileByPath(src)
      ?? this.vault.getFiles().find((f) => f.name === src.split("/").pop());

    if (file) {
      const data = await this.vault.readBinary(file);
      return { data, fileName: file.name };
    }

    throw new Error(`找不到本地图片: ${src}`);
  }
}
