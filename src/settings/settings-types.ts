/**
 * 插件设置项类型定义
 *
 * 包含飞书应用凭据、同步目标配置、同步规则等所有持久化设置
 */

/** 同步模式 */
export type SyncMode = "manual" | "on-save";

/** 更新策略 */
export type UpdateStrategy = "overwrite" | "skip-if-exists";

/** 插件全量设置 */
export interface FeishuWikiSettings {
  // ── 飞书应用凭据 ──────────────────────────────
  /** 飞书自建应用 App ID */
  appId: string;
  /** 飞书自建应用 App Secret（明文存储在 data.json，Obsidian 保护本地文件） */
  appSecret: string;
  /** 缓存的 tenant_access_token */
  cachedToken: string;
  /** token 过期时间（Unix 秒） */
  tokenExpireAt: number;

  // ── 同步目标 ──────────────────────────────────
  /** 默认知识空间 ID */
  defaultSpaceId: string;
  /** 默认知识空间名称（用于展示） */
  defaultSpaceName: string;
  /** 默认根节点 token（空字符串表示同步到知识空间根部） */
  defaultParentNodeToken: string;
  /** 默认根节点名称（用于展示） */
  defaultParentNodeName: string;

  // ── 同步规则 ──────────────────────────────────
  /** 同步模式: 手动 或 保存时自动 */
  syncMode: SyncMode;
  /** frontmatter 过滤字段，如 "publish: true"（空字符串表示不过滤） */
  frontmatterFilter: string;
  /** 排除的文件夹列表（英文逗号分隔） */
  excludeFolders: string;

  // ── 高级设置 ──────────────────────────────────
  /** 是否自动上传本地图片 */
  uploadLocalImages: boolean;
  /** 更新策略 */
  updateStrategy: UpdateStrategy;
  /** 是否启用调试日志 */
  debugLog: boolean;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: FeishuWikiSettings = {
  appId: "",
  appSecret: "",
  cachedToken: "",
  tokenExpireAt: 0,
  defaultSpaceId: "",
  defaultSpaceName: "",
  defaultParentNodeToken: "",
  defaultParentNodeName: "",
  syncMode: "manual",
  frontmatterFilter: "",
  excludeFolders: "templates, .trash",
  uploadLocalImages: true,
  updateStrategy: "overwrite",
  debugLog: false,
};
