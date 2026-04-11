/**
 * 飞书知识库同步 - 侧边栏面板（文件夹树形视图）
 *
 * 功能：
 * - 以可折叠文件夹树展示 vault 所有 markdown 文件
 * - 每个文件/文件夹带复选框，支持批量选择
 * - 同步状态指示器（已同步/待更新/未同步）
 * - 文件夹勾选自动级联子项
 * - 顶部操作栏：同步选中、全选、取消全选、刷新
 * - 过滤栏：全部 / 已修改 / 未同步
 * - 搜索框：按文件名过滤
 */

import { ItemView, WorkspaceLeaf, TFile, TFolder, TAbstractFile, setIcon } from "obsidian";
import type FeishuWikiPlugin from "../main";
import { SyncStateManager, SyncMeta } from "../sync/sync-state";

export const VIEW_TYPE_FEISHU_SYNC = "feishu-wiki-sync-view";

/** 同步状态枚举 */
type SyncStatus = "synced" | "update" | "unsynced";

/** 过滤模式 */
type FilterMode = "all" | "modified" | "unsynced";

/** 树节点数据结构 */
interface TreeNode {
  /** 节点名称（文件名或文件夹名） */
  name: string;
  /** 完整路径 */
  path: string;
  /** 是否为文件夹 */
  isFolder: boolean;
  /** 子节点列表（文件夹有） */
  children: TreeNode[];
  /** 对应的 TFile（仅文件有） */
  file?: TFile;
  /** 同步状态（仅文件有） */
  syncStatus?: SyncStatus;
  /** 同步元数据（仅文件有） */
  syncMeta?: SyncMeta | null;
}

export class FeishuSyncSidebarView extends ItemView {
  private plugin: FeishuWikiPlugin;
  private syncState: SyncStateManager;

  /** 选中的文件路径集合 */
  private checkedPaths: Set<string> = new Set();
  /** 展开的文件夹路径集合 */
  private expandedPaths: Set<string> = new Set();
  /** 当前过滤模式 */
  private filterMode: FilterMode = "all";
  /** 当前搜索关键字 */
  private searchQuery = "";
  /** 完整的树结构（缓存） */
  private fullTree: TreeNode | null = null;
  /** 所有文件的同步统计 */
  private stats = { synced: 0, update: 0, unsynced: 0, total: 0 };

  constructor(leaf: WorkspaceLeaf, plugin: FeishuWikiPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.syncState = new SyncStateManager(plugin.app);
  }

  getViewType(): string {
    return VIEW_TYPE_FEISHU_SYNC;
  }

  getDisplayText(): string {
    return "飞书知识库同步";
  }

  getIcon(): string {
    return "cloud-upload";
  }

  async onOpen(): Promise<void> {
    await this.renderView();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }

  /** 外部调用刷新面板 */
  async refresh(): Promise<void> {
    await this.renderView();
  }

  // ══════════════════════════════════════════════════════════════
  //  数据构建
  // ══════════════════════════════════════════════════════════════

  /** 构建完整的文件夹树结构 */
  private buildTree(): TreeNode {
    const root: TreeNode = {
      name: this.app.vault.getName(),
      path: "",
      isFolder: true,
      children: [],
    };

    const allFiles = this.app.vault.getMarkdownFiles();
    let synced = 0, update = 0, unsynced = 0;

    // 收集所有文件的同步状态
    const fileMap: Map<string, { file: TFile; status: SyncStatus; meta: SyncMeta | null }> = new Map();
    for (const file of allFiles) {
      const meta = this.syncState.readSyncMeta(file);
      let status: SyncStatus;
      if (!meta) {
        status = "unsynced";
        unsynced++;
      } else if (this.syncState.needsSync(file, meta)) {
        status = "update";
        update++;
      } else {
        status = "synced";
        synced++;
      }
      fileMap.set(file.path, { file, status, meta });
    }

    this.stats = { synced, update, unsynced, total: allFiles.length };

    // 递归构建树
    const buildChildren = (folder: TFolder): TreeNode[] => {
      const nodes: TreeNode[] = [];

      for (const child of folder.children) {
        if (child instanceof TFolder) {
          // 递归构建文件夹节点
          const folderNode: TreeNode = {
            name: child.name,
            path: child.path,
            isFolder: true,
            children: buildChildren(child),
          };
          // 只添加包含 md 文件的文件夹
          if (this.folderHasMarkdown(folderNode)) {
            nodes.push(folderNode);
          }
        } else if (child instanceof TFile && child.extension === "md") {
          const info = fileMap.get(child.path);
          if (info) {
            nodes.push({
              name: child.basename,
              path: child.path,
              isFolder: false,
              children: [],
              file: info.file,
              syncStatus: info.status,
              syncMeta: info.meta,
            });
          }
        }
      }

      // 排序：文件夹在前，文件在后，各自按名称排序
      nodes.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return nodes;
    };

    const rootFolder = this.app.vault.getRoot();
    root.children = buildChildren(rootFolder);
    this.fullTree = root;
    return root;
  }

  /** 判断文件夹节点是否包含 markdown 文件（递归） */
  private folderHasMarkdown(node: TreeNode): boolean {
    if (!node.isFolder) return false;
    for (const child of node.children) {
      if (!child.isFolder) return true;
      if (this.folderHasMarkdown(child)) return true;
    }
    return false;
  }

  /** 根据过滤模式和搜索词过滤树节点 */
  private filterTree(node: TreeNode): TreeNode | null {
    if (!node.isFolder) {
      // 文件节点 — 应用过滤和搜索
      if (this.filterMode === "modified" && node.syncStatus !== "update") return null;
      if (this.filterMode === "unsynced" && node.syncStatus !== "unsynced") return null;
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        if (!node.name.toLowerCase().includes(query) && !node.path.toLowerCase().includes(query)) {
          return null;
        }
      }
      return node;
    }

    // 文件夹节点 — 递归过滤子节点
    const filteredChildren: TreeNode[] = [];
    for (const child of node.children) {
      const filtered = this.filterTree(child);
      if (filtered) filteredChildren.push(filtered);
    }

    if (filteredChildren.length === 0) return null;

    return {
      ...node,
      children: filteredChildren,
    };
  }

  /** 获取节点下所有文件路径（递归） */
  private collectFilePaths(node: TreeNode): string[] {
    if (!node.isFolder) return [node.path];
    const paths: string[] = [];
    for (const child of node.children) {
      paths.push(...this.collectFilePaths(child));
    }
    return paths;
  }

  /**
   * 从完整树（未过滤）中按路径查找节点
   * 勾选文件夹时必须用完整树的节点，否则过滤后子文件不完整
   */
  private findFullTreeNode(path: string): TreeNode | null {
    if (!this.fullTree) return null;
    const search = (node: TreeNode): TreeNode | null => {
      if (node.path === path) return node;
      for (const child of node.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };
    return search(this.fullTree);
  }

  /**
   * 勾选/取消勾选文件夹下所有文件（用完整树而非过滤树）
   */
  private toggleFolderCheck(folderPath: string, checked: boolean): void {
    const fullNode = this.findFullTreeNode(folderPath);
    const node = fullNode ?? { path: folderPath, name: "", isFolder: true, children: [] };
    const paths = this.collectFilePaths(node);
    if (checked) {
      paths.forEach((p) => this.checkedPaths.add(p));
    } else {
      paths.forEach((p) => this.checkedPaths.delete(p));
    }
  }

  /** 获取文件夹内的同步统计 */
  private getFolderStats(node: TreeNode): { synced: number; total: number } {
    let synced = 0, total = 0;
    for (const child of node.children) {
      if (child.isFolder) {
        const sub = this.getFolderStats(child);
        synced += sub.synced;
        total += sub.total;
      } else {
        total++;
        if (child.syncStatus === "synced") synced++;
      }
    }
    return { synced, total };
  }

  /** 判断文件夹内所有文件是否全部选中（用完整树） */
  private isFolderFullyChecked(node: TreeNode): boolean {
    const fullNode = this.findFullTreeNode(node.path) ?? node;
    const paths = this.collectFilePaths(fullNode);
    return paths.length > 0 && paths.every((p) => this.checkedPaths.has(p));
  }

  /** 判断文件夹内是否有部分文件选中（用完整树） */
  private isFolderPartiallyChecked(node: TreeNode): boolean {
    const fullNode = this.findFullTreeNode(node.path) ?? node;
    const paths = this.collectFilePaths(fullNode);
    const checkedCount = paths.filter((p) => this.checkedPaths.has(p)).length;
    return checkedCount > 0 && checkedCount < paths.length;
  }

  // ══════════════════════════════════════════════════════════════
  //  渲染
  // ══════════════════════════════════════════════════════════════

  /** 主渲染入口 */
  private async renderView(): Promise<void> {
    const container = this.contentEl;
    container.empty();
    container.addClass("feishu-sidebar");

    // 构建数据
    const tree = this.buildTree();

    // ── 连接状态栏 ──
    this.renderConnectionStatus(container);

    // ── 操作栏 ──
    this.renderActionBar(container);

    // ── 搜索栏 ──
    this.renderSearchBar(container);

    // ── 过滤栏 ──
    this.renderFilterBar(container);

    // ── 文件树 ──
    const treeContainer = container.createDiv("feishu-tree-view");
    const filteredTree = this.filterTree(tree);
    if (filteredTree && filteredTree.children.length > 0) {
      this.renderTreeChildren(treeContainer, filteredTree.children, 0);
    } else {
      const emptyEl = treeContainer.createDiv("feishu-tree-empty");
      emptyEl.textContent = this.searchQuery || this.filterMode !== "all"
        ? "没有匹配的文件"
        : "没有 Markdown 文件";
    }
  }

  /** 渲染连接状态 */
  private renderConnectionStatus(container: HTMLElement): void {
    const statusBar = container.createDiv("feishu-sidebar-status-bar");

    const isConfigured = this.plugin.settings.appId && this.plugin.settings.appSecret;

    if (!isConfigured) {
      const dot = statusBar.createSpan("feishu-status-dot feishu-dot-gray");
      const textEl = statusBar.createSpan("feishu-status-text");
      textEl.textContent = "未配置凭据";
      const configBtn = statusBar.createEl("button", {
        cls: "feishu-status-config-btn",
      });
      configBtn.textContent = "前往配置";
      configBtn.addEventListener("click", () => {
        (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
          .setting.open();
        (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
          .setting.openTabById("obsidian-feishu-wiki-sync");
      });
    } else {
      const dot = statusBar.createSpan("feishu-status-dot feishu-dot-green");
      const textEl = statusBar.createSpan("feishu-status-text");
      const spaceName = this.plugin.settings.defaultSpaceName;
      textEl.textContent = spaceName
        ? `${spaceName}`
        : "已配置";
      if (this.plugin.settings.defaultParentNodeName) {
        const nodeEl = statusBar.createSpan("feishu-status-node-text");
        nodeEl.textContent = ` / ${this.plugin.settings.defaultParentNodeName}`;
      }
    }
  }

  /** 渲染操作栏 */
  private renderActionBar(container: HTMLElement): void {
    const toolbar = container.createDiv("feishu-sidebar-toolbar");

    // 同步选中按钮
    const btnSync = toolbar.createEl("button", {
      cls: "feishu-toolbar-btn feishu-toolbar-btn-primary",
      attr: { "aria-label": "同步选中文件" },
    });
    const syncIconEl = btnSync.createSpan("feishu-toolbar-btn-icon");
    setIcon(syncIconEl, "upload");
    const syncLabelEl = btnSync.createSpan("feishu-toolbar-btn-label");
    const checkedCount = this.checkedPaths.size;
    syncLabelEl.textContent = checkedCount > 0 ? `同步 (${checkedCount})` : "同步";
    btnSync.disabled = checkedCount === 0;
    btnSync.addEventListener("click", () => this.syncSelected());

    // 间距
    toolbar.createDiv("feishu-toolbar-spacer");

    // 全选
    const btnSelectAll = toolbar.createEl("button", {
      cls: "feishu-toolbar-btn",
      attr: { "aria-label": "全选" },
    });
    setIcon(btnSelectAll, "check-square");
    btnSelectAll.title = "全选";
    btnSelectAll.addEventListener("click", () => this.selectAll());

    // 取消全选
    const btnDeselectAll = toolbar.createEl("button", {
      cls: "feishu-toolbar-btn",
      attr: { "aria-label": "取消全选" },
    });
    setIcon(btnDeselectAll, "square");
    btnDeselectAll.title = "取消全选";
    btnDeselectAll.addEventListener("click", () => this.deselectAll());

    // 刷新
    const btnRefresh = toolbar.createEl("button", {
      cls: "feishu-toolbar-btn",
      attr: { "aria-label": "刷新" },
    });
    setIcon(btnRefresh, "refresh-cw");
    btnRefresh.title = "刷新";
    btnRefresh.addEventListener("click", () => this.refresh());

    // 设置
    const btnSettings = toolbar.createEl("button", {
      cls: "feishu-toolbar-btn",
      attr: { "aria-label": "打开设置" },
    });
    setIcon(btnSettings, "settings");
    btnSettings.title = "打开设置";
    btnSettings.addEventListener("click", () => {
      (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
        .setting.open();
      (this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
        .setting.openTabById("obsidian-feishu-wiki-sync");
    });
  }

  /** 渲染搜索栏 */
  private renderSearchBar(container: HTMLElement): void {
    const searchBar = container.createDiv("feishu-search-bar");
    const searchIconEl = searchBar.createSpan("feishu-search-icon");
    setIcon(searchIconEl, "search");
    const searchInput = searchBar.createEl("input", {
      cls: "feishu-search-input",
      attr: {
        type: "text",
        placeholder: "搜索文件...",
      },
    });
    searchInput.value = this.searchQuery;
    searchInput.addEventListener("input", () => {
      this.searchQuery = searchInput.value;
      this.rerenderTree();
    });

    // 清除按钮
    if (this.searchQuery) {
      const clearBtn = searchBar.createSpan("feishu-search-clear");
      setIcon(clearBtn, "x");
      clearBtn.addEventListener("click", () => {
        this.searchQuery = "";
        searchInput.value = "";
        this.rerenderTree();
      });
    }
  }

  /** 渲染过滤栏 */
  private renderFilterBar(container: HTMLElement): void {
    const filterBar = container.createDiv("feishu-filter-bar");

    const filters: { mode: FilterMode; label: string; count: number }[] = [
      { mode: "all", label: "全部", count: this.stats.total },
      { mode: "modified", label: "待更新", count: this.stats.update },
      { mode: "unsynced", label: "未同步", count: this.stats.unsynced },
    ];

    for (const f of filters) {
      const tab = filterBar.createDiv("feishu-filter-tab");
      if (this.filterMode === f.mode) tab.addClass("is-active");
      tab.textContent = `${f.label}`;
      const badge = tab.createSpan("feishu-filter-badge");
      badge.textContent = String(f.count);
      tab.addEventListener("click", () => {
        this.filterMode = f.mode;
        this.rerenderTree();
      });
    }
  }

  /** 仅重新渲染文件树部分 */
  private rerenderTree(): void {
    const container = this.contentEl;
    container.empty();
    container.addClass("feishu-sidebar");

    // 用缓存的树数据（不重新 buildTree 来保持选中状态）
    if (!this.fullTree) {
      this.buildTree();
    }

    this.renderConnectionStatus(container);
    this.renderActionBar(container);
    this.renderSearchBar(container);
    this.renderFilterBar(container);

    // 过滤树
    const treeView = container.createDiv("feishu-tree-view");
    if (this.fullTree) {
      const filtered = this.filterTree(this.fullTree);
      if (filtered && filtered.children.length > 0) {
        this.renderTreeChildren(treeView, filtered.children, 0);
      } else {
        treeView.createDiv({ cls: "feishu-tree-empty", text: "没有匹配的文件" });
      }
    }
  }

  /** 渲染一组子节点 */
  private renderTreeChildren(container: HTMLElement, nodes: TreeNode[], depth: number): void {
    for (const node of nodes) {
      if (node.isFolder) {
        this.renderFolderNode(container, node, depth);
      } else {
        this.renderFileNode(container, node, depth);
      }
    }
  }

  /** 渲染文件夹节点 */
  private renderFolderNode(container: HTMLElement, node: TreeNode, depth: number): void {
    const isExpanded = this.expandedPaths.has(node.path);
    const isFullyChecked = this.isFolderFullyChecked(node);
    const isPartiallyChecked = this.isFolderPartiallyChecked(node);
    const folderStats = this.getFolderStats(node);

    // 文件夹行
    const row = container.createDiv("feishu-tree-row feishu-tree-folder-row");
    row.style.paddingLeft = `${depth * 18 + 4}px`;

    // 展开/折叠图标
    const toggleEl = row.createSpan("feishu-tree-toggle");
    setIcon(toggleEl, isExpanded ? "chevron-down" : "chevron-right");
    toggleEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isExpanded) {
        this.expandedPaths.delete(node.path);
      } else {
        this.expandedPaths.add(node.path);
      }
      this.rerenderTree();
    });

    // 复选框
    const checkboxEl = row.createEl("input", {
      cls: "feishu-tree-checkbox",
      attr: { type: "checkbox" },
    });
    checkboxEl.checked = isFullyChecked;
    checkboxEl.indeterminate = isPartiallyChecked;
    // checkbox 点击 → 只阻止冒泡，由自身 change 处理
    checkboxEl.addEventListener("click", (e) => e.stopPropagation());
    checkboxEl.addEventListener("change", () => {
      this.toggleFolderCheck(node.path, checkboxEl.checked);
      this.rerenderTree();
    });

    // 文件夹图标
    const iconEl = row.createSpan("feishu-tree-icon");
    setIcon(iconEl, isExpanded ? "folder-open" : "folder");

    // 文件夹名称
    const nameEl = row.createSpan("feishu-tree-name");
    nameEl.textContent = node.name;

    // 统计 badge
    const badgeEl = row.createSpan("feishu-tree-folder-badge");
    badgeEl.textContent = `${folderStats.synced}/${folderStats.total}`;

    // 点击行（非 checkbox、非箭头区域）→ 切换勾选
    row.addEventListener("click", () => {
      const newChecked = !this.isFolderFullyChecked(node);
      this.toggleFolderCheck(node.path, newChecked);
      if (newChecked && !this.expandedPaths.has(node.path)) {
        this.expandedPaths.add(node.path);
      }
      this.rerenderTree();
    });

    // 子节点容器
    if (isExpanded) {
      const childContainer = container.createDiv("feishu-tree-children");
      this.renderTreeChildren(childContainer, node.children, depth + 1);
    }
  }

  /** 渲染文件节点 */
  private renderFileNode(container: HTMLElement, node: TreeNode, depth: number): void {
    const isChecked = this.checkedPaths.has(node.path);

    const row = container.createDiv("feishu-tree-row feishu-tree-file-row");
    if (isChecked) row.addClass("is-checked");
    row.style.paddingLeft = `${depth * 18 + 4}px`;

    // 占位符（对齐展开箭头位置）
    row.createSpan("feishu-tree-toggle feishu-tree-toggle-spacer");

    // 复选框
    const checkboxEl = row.createEl("input", {
      cls: "feishu-tree-checkbox",
      attr: { type: "checkbox" },
    });
    checkboxEl.checked = isChecked;
    checkboxEl.addEventListener("click", (e) => e.stopPropagation());
    checkboxEl.addEventListener("change", () => {
      if (checkboxEl.checked) {
        this.checkedPaths.add(node.path);
      } else {
        this.checkedPaths.delete(node.path);
      }
      this.rerenderTree();
    });

    // 点击行 → 切换勾选
    row.addEventListener("click", () => {
      if (this.checkedPaths.has(node.path)) {
        this.checkedPaths.delete(node.path);
      } else {
        this.checkedPaths.add(node.path);
      }
      this.rerenderTree();
    });

    // 同步状态图标
    const statusEl = row.createSpan("feishu-tree-status");
    switch (node.syncStatus) {
      case "synced":
        setIcon(statusEl, "check-circle");
        statusEl.addClass("feishu-status-synced");
        statusEl.title = "已同步";
        break;
      case "update":
        setIcon(statusEl, "alert-circle");
        statusEl.addClass("feishu-status-update");
        statusEl.title = "待更新";
        break;
      default:
        setIcon(statusEl, "circle");
        statusEl.addClass("feishu-status-none");
        statusEl.title = "未同步";
        break;
    }

    // 文件图标
    const iconEl = row.createSpan("feishu-tree-icon");
    setIcon(iconEl, "file-text");

    // 文件名（点击打开文件）
    const nameEl = row.createSpan("feishu-tree-name feishu-tree-file-name");
    nameEl.textContent = node.name;
    nameEl.addEventListener("click", (e) => {
      e.stopPropagation();
      if (node.file) {
        this.app.workspace.getLeaf(false).openFile(node.file);
      }
    });

    // 单文件同步按钮（hover 可见）
    const syncBtn = row.createSpan("feishu-tree-file-sync-btn");
    setIcon(syncBtn, "upload");
    syncBtn.title = "同步此笔记";
    syncBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (node.file) {
        setIcon(syncBtn, "loader");
        await this.plugin.syncSingleFile(node.file);
        await this.refresh();
      }
    });

    // 点击行切换勾选
    row.addEventListener("click", () => {
      if (isChecked) {
        this.checkedPaths.delete(node.path);
      } else {
        this.checkedPaths.add(node.path);
      }
      this.rerenderTree();
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  操作
  // ══════════════════════════════════════════════════════════════

  /** 全选当前可见的文件 */
  private selectAll(): void {
    if (!this.fullTree) return;
    const filtered = this.filterTree(this.fullTree);
    if (!filtered) return;
    const paths = this.collectFilePaths(filtered);
    paths.forEach((p) => this.checkedPaths.add(p));
    this.rerenderTree();
  }

  /** 取消全选 */
  private deselectAll(): void {
    this.checkedPaths.clear();
    this.rerenderTree();
  }

  /** 同步选中的文件 */
  private async syncSelected(): Promise<void> {
    if (this.checkedPaths.size === 0) return;

    const files: TFile[] = [];
    for (const path of this.checkedPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        files.push(file);
      }
    }

    if (files.length === 0) return;

    // 逐个同步选中的文件
    for (const file of files) {
      await this.plugin.syncSingleFile(file);
    }

    // 清空选择并刷新
    this.checkedPaths.clear();
    await this.refresh();
  }
}
