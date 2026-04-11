/**
 * 同步状态管理
 *
 * 功能：
 * - 读取/写入笔记 frontmatter 中的飞书同步元数据
 * - 使用 Obsidian 的 processFrontMatter API（原子操作，避免竞争条件）
 *
 * Frontmatter 字段：
 * - feishu_wiki_space: 知识空间 ID
 * - feishu_wiki_node: 节点 token
 * - feishu_doc_token: 文档 token（obj_token）
 * - feishu_last_sync: 上次同步时间（ISO 8601）
 * - feishu_doc_revision: 文档版本号
 */

import { App, TFile } from "obsidian";

/** 存储在 frontmatter 中的同步元数据 */
export interface SyncMeta {
  spaceId: string;
  nodeToken: string;
  docToken: string;
  lastSync: string;
  docRevision: number;
}

const FRONTMATTER_KEYS = {
  spaceId: "feishu_wiki_space",
  nodeToken: "feishu_wiki_node",
  docToken: "feishu_doc_token",
  lastSync: "feishu_last_sync",
  docRevision: "feishu_doc_revision",
} as const;

export class SyncStateManager {
  constructor(private app: App) {}

  /**
   * 从文件的 frontmatter 中读取同步元数据
   *
   * 输入参数：
   * - file: Obsidian 文件对象
   *
   * 返回值：SyncMeta 或 null（表示从未同步）
   */
  readSyncMeta(file: TFile): SyncMeta | null {
    const cache = this.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm?.[FRONTMATTER_KEYS.docToken]) return null;

    return {
      spaceId: fm[FRONTMATTER_KEYS.spaceId] ?? "",
      nodeToken: fm[FRONTMATTER_KEYS.nodeToken] ?? "",
      docToken: fm[FRONTMATTER_KEYS.docToken] ?? "",
      lastSync: fm[FRONTMATTER_KEYS.lastSync] ?? "",
      docRevision: fm[FRONTMATTER_KEYS.docRevision] ?? 0,
    };
  }

  /**
   * 将同步元数据写入文件的 frontmatter（原子操作）
   *
   * 输入参数：
   * - file: Obsidian 文件对象
   * - meta: 要写入的同步元数据
   */
  async writeSyncMeta(file: TFile, meta: SyncMeta): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm[FRONTMATTER_KEYS.spaceId] = meta.spaceId;
      fm[FRONTMATTER_KEYS.nodeToken] = meta.nodeToken;
      fm[FRONTMATTER_KEYS.docToken] = meta.docToken;
      fm[FRONTMATTER_KEYS.lastSync] = meta.lastSync;
      fm[FRONTMATTER_KEYS.docRevision] = meta.docRevision;
    });
  }

  /**
   * 检查文件是否需要同步（本地修改时间晚于上次同步时间）
   *
   * 输入参数：
   * - file: 文件对象
   * - meta: 已有的同步元数据
   *
   * 返回值：true 表示需要同步
   */
  needsSync(file: TFile, meta: SyncMeta | null): boolean {
    if (!meta) return true;
    const lastSyncMs = new Date(meta.lastSync).getTime();
    return file.stat.mtime > lastSyncMs;
  }
}
