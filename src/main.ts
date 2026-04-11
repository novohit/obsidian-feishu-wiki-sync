/**
 * Obsidian 飞书知识库同步插件入口
 *
 * 功能：
 * - 注册设置页面、命令、右键菜单
 * - 初始化各模块（Auth / WikiApi / DocApi / DriveApi / SyncEngine）
 * - 保存时自动同步（可选）
 *
 * 运行方式：
 * npm run dev   — 开发模式（watch，产出 main.js）
 * npm run build — 生产构建
 */

import {
  Plugin,
  TFile,
  TFolder,
  Menu,
  Notice,
  WorkspaceLeaf,
} from "obsidian";
import { FeishuWikiSettings, DEFAULT_SETTINGS } from "./settings/settings-types";
import { FeishuWikiSettingTab } from "./settings/settings-tab";
import { FeishuAuth } from "./feishu/auth";
import { WikiApi } from "./feishu/wiki-api";
import { DocApi } from "./feishu/doc-api";
import { DriveApi } from "./feishu/drive-api";
import { RateLimiter } from "./feishu/rate-limiter";
import { SyncEngine } from "./sync/sync-engine";
import { WikiBrowserModal } from "./ui/wiki-browser-modal";
import { SyncProgressModal } from "./ui/sync-progress-modal";
import { FeishuSyncSidebarView, VIEW_TYPE_FEISHU_SYNC } from "./ui/sync-sidebar-view";

export default class FeishuWikiPlugin extends Plugin {
  settings!: FeishuWikiSettings;
  auth!: FeishuAuth;
  wikiApi!: WikiApi;
  private docApi!: DocApi;
  private driveApi!: DriveApi;
  private syncEngine!: SyncEngine;

  async onload(): Promise<void> {
    // 加载设置
    await this.loadSettings();

    // 初始化各模块
    this.initModules();

    // 注册侧边栏视图
    this.registerView(VIEW_TYPE_FEISHU_SYNC, (leaf) => new FeishuSyncSidebarView(leaf, this));

    // 注册左侧 ribbon 图标（点击打开/聚焦侧边栏）
    this.addRibbonIcon("cloud-upload", "飞书知识库同步", () => {
      this.activateSidebarView();
    });

    // 注册设置标签页
    this.addSettingTab(new FeishuWikiSettingTab(this.app, this));

    // 注册命令
    this.registerCommands();

    // 注册文件右键菜单
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, abstractFile) => {
        if (abstractFile instanceof TFile || abstractFile instanceof TFolder) {
          this.addFileContextMenu(menu, abstractFile);
        }
      })
    );

    // 注册保存时自动同步（如果配置了 on-save 模式）
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (
          this.settings.syncMode === "on-save" &&
          file instanceof TFile &&
          file.extension === "md"
        ) {
          await this.syncSingleFile(file);
        }
      })
    );
  }

  onunload(): void {
    // 卸载时关闭侧边栏视图
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FEISHU_SYNC);
  }

  /** 激活侧边栏视图（如果已存在则聚焦，否则创建） */
  async activateSidebarView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FEISHU_SYNC);
    if (existing.length > 0) {
      // 已存在，聚焦并刷新
      this.app.workspace.revealLeaf(existing[0]);
      const view = existing[0].view;
      if (view instanceof FeishuSyncSidebarView) {
        await view.refresh();
      }
      return;
    }
    // 创建新的侧边栏叶子
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_FEISHU_SYNC, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }

  /** 刷新侧边栏（同步完成后调用） */
  private refreshSidebar(): void {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FEISHU_SYNC);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof FeishuSyncSidebarView) {
        view.refresh();
      }
    }
  }

  /** 初始化所有模块实例 */
  private initModules(): void {
    const rateLimiter = new RateLimiter();

    this.auth = new FeishuAuth(
      this.settings.appId,
      this.settings.appSecret,
      this.settings.cachedToken,
      this.settings.tokenExpireAt,
      async (token, expireAt) => {
        this.settings.cachedToken = token;
        this.settings.tokenExpireAt = expireAt;
        await this.saveSettings();
      }
    );

    this.wikiApi = new WikiApi(this.auth, rateLimiter);
    this.docApi = new DocApi(this.auth, rateLimiter);
    this.driveApi = new DriveApi(this.auth, rateLimiter);

    this.syncEngine = new SyncEngine(
      this.app,
      this.settings,
      this.wikiApi,
      this.docApi,
      this.driveApi
    );
  }

  /** 注册命令面板命令 */
  private registerCommands(): void {
    // 同步当前笔记
    this.addCommand({
      id: "sync-current-note",
      name: "同步当前笔记到飞书知识库",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") return false;
        if (!checking) {
          this.syncSingleFile(file);
        }
        return true;
      },
    });

    // 打开设置
    this.addCommand({
      id: "open-settings",
      name: "打开飞书知识库同步设置",
      callback: () => {
        // 跳转到插件设置页
        (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
          .setting.open();
        (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
          .setting.openTabById("obsidian-feishu-wiki-sync");
      },
    });

    // 打开侧边栏
    this.addCommand({
      id: "open-sidebar",
      name: "打开飞书同步面板",
      callback: () => this.activateSidebarView(),
    });

    // 测试连接
    this.addCommand({
      id: "test-connection",
      name: "测试飞书连接",
      callback: async () => {
        new Notice("正在测试连接...", 2000);
        const result = await this.auth.testConnection();
        if (result.success) {
          new Notice("飞书连接成功", 3000);
        } else {
          new Notice(`飞书连接失败: ${result.message}`, 5000);
        }
      },
    });
  }

  /** 添加文件/文件夹右键菜单项 */
  private addFileContextMenu(menu: Menu, file: TFile | TFolder): void {
    if (file instanceof TFile && file.extension === "md") {
      menu.addItem((item) => {
        item
          .setTitle("同步到飞书知识库")
          .setIcon("cloud-upload")
          .onClick(() => this.syncSingleFile(file));
      });
    }

    if (file instanceof TFolder) {
      menu.addItem((item) => {
        item
          .setTitle("同步文件夹到飞书知识库")
          .setIcon("cloud-upload")
          .onClick(() => this.syncFolder(file));
      });
    }
  }

  /**
   * 同步单篇笔记
   *
   * 如果有默认空间配置，直接同步；否则弹出选择器
   */
  async syncSingleFile(file: TFile): Promise<void> {
    if (!this.settings.appId || !this.settings.appSecret) {
      new Notice("请先在插件设置中配置飞书应用凭据", 4000);
      return;
    }

    if (!this.settings.defaultSpaceId) {
      // 没有配置默认空间，弹出浏览器让用户选择
      new WikiBrowserModal(
        this.app,
        this.wikiApi,
        "",
        "",
        async (result) => {
          if (!result) return;
          const syncResult = await this.syncEngine.syncFile(
            file,
            result.spaceId,
            result.nodeToken
          );
          if (syncResult.success) {
            new Notice(`已同步: ${file.basename}`, 3000);
          } else {
            new Notice(`同步失败: ${syncResult.error}`, 5000);
          }
        }
      ).open();
      return;
    }

    // 有默认配置，直接同步
    new Notice(`正在同步: ${file.basename}...`, 2000);
    const result = await this.syncEngine.syncFile(file);
    if (result.success) {
      new Notice(`已同步到飞书: ${file.basename}`, 3000);
    } else {
      new Notice(`同步失败: ${result.error}`, 5000);
    }
    this.refreshSidebar();
  }

  /**
   * 批量同步文件夹（带进度弹窗）
   */
  private async syncFolder(folder: TFolder): Promise<void> {
    if (!this.settings.appId || !this.settings.appSecret) {
      new Notice("请先在插件设置中配置飞书应用凭据", 4000);
      return;
    }

    if (!this.settings.defaultSpaceId) {
      new Notice("请先在插件设置中选择默认知识空间", 4000);
      return;
    }

    const progressModal = new SyncProgressModal(this.app, folder.name);
    progressModal.open();

    let cancelled = false;
    progressModal.setCancelCallback(() => {
      cancelled = true;
    });

    const results = await this.syncEngine.syncFolder(
      folder,
      this.settings.defaultSpaceId,
      this.settings.defaultParentNodeToken,
      (done, total, currentFile) => {
        progressModal.updateProgress(done, total, currentFile);
        if (currentFile) {
          progressModal.setFileStatus(currentFile, "syncing");
        }
      }
    );

    // 更新最终状态
    let successCount = 0;
    let failCount = 0;
    for (const result of results) {
      if (result.success) {
        successCount++;
        progressModal.setFileStatus(result.fileName, "done");
      } else {
        failCount++;
        progressModal.setFileStatus(result.fileName, "error", result.error);
      }
    }

    progressModal.updateProgress(results.length, results.length, "");

    const summary = failCount > 0
      ? `批量同步完成: 成功 ${successCount}, 失败 ${failCount}`
      : `批量同步完成: ${successCount} 个文件`;
    new Notice(summary, 5000);
  }

  /** 加载设置（合并默认值） */
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /** 保存设置到磁盘 */
  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
