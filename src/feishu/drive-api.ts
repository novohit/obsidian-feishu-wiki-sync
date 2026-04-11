/**
 * 飞书云盘（Drive）API 封装
 *
 * 功能：上传图片/文件到飞书云盘，获取 file_token 用于文档内嵌
 *
 * 限制：
 * - 单文件最大 20MB
 * - 频率限制：5 QPS（通过 RateLimiter 控制）
 */

import { requestUrl } from "obsidian";
import { FeishuResponse, MediaUploadResponse } from "./types";
import { FeishuAuth } from "./auth";
import { RateLimiter } from "./rate-limiter";

const API_BASE = "https://open.feishu.cn/open-apis";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export class DriveApi {
  constructor(private auth: FeishuAuth, private rateLimiter: RateLimiter) {}

  /**
   * 上传图片到飞书云盘，返回 file_token
   *
   * 输入参数：
   * - fileName: 文件名（含扩展名）
   * - fileData: 文件二进制数据
   * - parentDocumentId: 所属文档 ID（飞书要求指定 parent_node）
   *
   * 返回值：file_token，用于在文档 image block 中引用
   */
  async uploadImage(
    fileName: string,
    fileData: ArrayBuffer,
    parentDocumentId: string
  ): Promise<string> {
    if (fileData.byteLength > MAX_FILE_SIZE) {
      throw new Error(`图片 "${fileName}" 超过 20MB 限制，已跳过上传`);
    }

    await this.rateLimiter.acquire("media");
    const token = await this.auth.getToken();

    // 构建 multipart/form-data
    const boundary = `----FeishuWikiSync${Date.now()}`;
    const bodyParts: Uint8Array[] = [];

    const addField = (name: string, value: string): void => {
      const part = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
      bodyParts.push(new TextEncoder().encode(part));
    };

    // 文本字段
    addField("file_name", fileName);
    addField("parent_type", "docx_image");
    addField("parent_node", parentDocumentId);
    addField("size", String(fileData.byteLength));

    // 文件字段
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
    bodyParts.push(new TextEncoder().encode(fileHeader));
    bodyParts.push(new Uint8Array(fileData));
    bodyParts.push(new TextEncoder().encode(`\r\n--${boundary}--\r\n`));

    // 合并所有 parts
    const totalLength = bodyParts.reduce((sum, part) => sum + part.byteLength, 0);
    const body = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of bodyParts) {
      body.set(part, offset);
      offset += part.byteLength;
    }

    const resp = await requestUrl({
      url: `${API_BASE}/drive/v1/medias/upload_all`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: body.buffer,
      throw: false,
    });

    const data: FeishuResponse<MediaUploadResponse> = resp.json;
    if (data.code !== 0) {
      throw new Error(`图片上传失败 (${data.code}): ${data.msg}`);
    }

    return data.data.file_token;
  }
}
