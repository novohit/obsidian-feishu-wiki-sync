/**
 * 知识空间/节点浏览器弹窗
 *
 * 功能：
 * - 展示知识空间下的节点树（懒加载子节点）
 * - 用户可以选中某个节点作为同步目标
 * - 确认后通过回调返回选中结果
 */

import { App, Modal, setIcon } from "obsidian";
import { WikiApi } from "../feishu/wiki-api";
import { WikiNode, WikiSpace } from "../feishu/types";

export interface WikiBrowserResult {
  spaceId: string;
  spaceName: string;
  nodeToken: string;
  nodeName: string;
}

export class WikiBrowserModal extends Modal {
  private spaces: WikiSpace[] = [];
  private selectedSpaceId = "";
  private selectedNodeToken = "";
  private selectedNodeName = "";
  private treeContainer: HTMLElement | null = null;
  private confirmCallback: (result: WikiBrowserResult | null) => void;

  constructor(
    app: App,
    private wikiApi: WikiApi,
    private currentSpaceId: string,
    private currentSpaceName: string,
    callback: (result: WikiBrowserResult | null) => void
  ) {
    super(app);
    this.selectedSpaceId = currentSpaceId;
    this.confirmCallback = callback;
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this;
    contentEl.addClass("feishu-wiki-browser");
    contentEl.createEl("h2", { text: "选择同步目标" });

    // 加载知识空间列表
    try {
      this.spaces = await this.wikiApi.listSpaces();
    } catch (err) {
      contentEl.createEl("p", {
        text: `获取知识空间失败: ${err instanceof Error ? err.message : String(err)}`,
        cls: "feishu-error",
      });
      return;
    }

    // 知识空间选择下拉
    const spaceRow = contentEl.createDiv("feishu-setting-row");
    spaceRow.createEl("label", { text: "知识空间" });
    const spaceSelect = spaceRow.createEl("select", { cls: "feishu-select" });

    for (const space of this.spaces) {
      const opt = spaceSelect.createEl("option", {
        value: space.space_id,
      });
      // 使用 textContent 确保中文名称正确显示
      opt.textContent = space.name || "";
      if (space.space_id === this.selectedSpaceId) opt.selected = true;
    }

    spaceSelect.addEventListener("change", () => {
      this.selectedSpaceId = spaceSelect.value;
      this.selectedNodeToken = "";
      this.selectedNodeName = "（知识空间根部）";
      this.renderNodeTree();
    });

    // 节点树容器
    contentEl.createEl("label", { text: "目标节点", cls: "feishu-label" });
    this.treeContainer = contentEl.createDiv("feishu-tree-container");
    await this.renderNodeTree();

    // 当前选中提示
    const selectedLabel = contentEl.createDiv("feishu-selected-label");
    this.updateSelectedLabel(selectedLabel);

    // 按钮行
    const btnRow = contentEl.createDiv("feishu-btn-row");

    const cancelBtn = btnRow.createEl("button", { text: "取消" });
    cancelBtn.addEventListener("click", () => {
      this.confirmCallback(null);
      this.close();
    });

    const confirmBtn = btnRow.createEl("button", {
      text: "确认选择",
      cls: "mod-cta",
    });
    confirmBtn.addEventListener("click", () => {
      const spaceName =
        this.spaces.find((s) => s.space_id === this.selectedSpaceId)?.name ?? "";
      this.confirmCallback({
        spaceId: this.selectedSpaceId,
        spaceName,
        nodeToken: this.selectedNodeToken,
        nodeName: this.selectedNodeName || "（根节点）",
      });
      this.close();
    });
  }

  /** 渲染节点树（根节点层） */
  private async renderNodeTree(): Promise<void> {
    if (!this.treeContainer) return;
    this.treeContainer.empty();

    if (!this.selectedSpaceId) {
      this.treeContainer.createEl("p", {
        text: "请先选择知识空间",
        cls: "feishu-muted",
      });
      return;
    }

    // 根节点选项（同步到空间顶层）
    this.renderNodeItem(this.treeContainer, {
      node_token: "",
      title: "（知识空间根部）",
      has_child: true,
      space_id: this.selectedSpaceId,
      obj_token: "",
      obj_type: "docx",
      parent_node_token: "",
      node_type: "origin",
    }, 0);

    // 加载第一层节点
    await this.loadAndRenderChildren(this.treeContainer, this.selectedSpaceId, undefined, 0);
  }

  /** 加载并渲染子节点 */
  private async loadAndRenderChildren(
    container: HTMLElement,
    spaceId: string,
    parentNodeToken: string | undefined,
    depth: number
  ): Promise<void> {
    const loadingEl = container.createEl("div", {
      text: "加载中...",
      cls: "feishu-loading",
    });
    loadingEl.style.paddingLeft = `${(depth + 1) * 16}px`;

    try {
      const nodes = await this.wikiApi.listNodes(spaceId, parentNodeToken);
      loadingEl.remove();
      for (const node of nodes) {
        this.renderNodeItem(container, node, depth + 1);
      }
      if (nodes.length === 0 && depth === 0) {
        container.createEl("p", { text: "该空间暂无内容", cls: "feishu-muted" });
      }
    } catch (err) {
      loadingEl.setText(`加载失败: ${err instanceof Error ? err.message : String(err)}`);
      loadingEl.addClass("feishu-error");
    }
  }

  /** 渲染单个节点行 */
  private renderNodeItem(
    container: HTMLElement,
    node: WikiNode,
    depth: number
  ): void {
    const row = container.createDiv("feishu-node-row");
    row.style.paddingLeft = `${depth * 16}px`;

    if (node.node_token === this.selectedNodeToken) {
      row.addClass("is-selected");
    }

    // 展开/折叠图标
    const toggleIcon = row.createSpan("feishu-node-toggle");
    if (node.has_child && node.node_token !== "") {
      setIcon(toggleIcon, "chevron-right");
    } else {
      toggleIcon.style.visibility = "hidden";
    }

    // 节点标题 — 使用 textContent 确保 Unicode 字符正确渲染
    const titleEl = row.createSpan({ cls: "feishu-node-title" });
    titleEl.textContent = node.title || "";

    // 点击选中
    titleEl.addEventListener("click", () => {
      // 取消之前的选中样式
      container
        .closest(".feishu-tree-container")
        ?.querySelectorAll(".feishu-node-row.is-selected")
        .forEach((el) => el.removeClass("is-selected"));

      row.addClass("is-selected");
      this.selectedNodeToken = node.node_token;
      this.selectedNodeName = node.title;

      // 更新底部选中标签
      const selectedLabel = this.contentEl.querySelector(".feishu-selected-label");
      if (selectedLabel instanceof HTMLElement) {
        this.updateSelectedLabel(selectedLabel);
      }
    });

    // 点击展开图标加载子节点
    if (node.has_child && node.node_token !== "") {
      let expanded = false;
      let childrenContainer: HTMLElement | null = null;

      toggleIcon.addEventListener("click", async () => {
        expanded = !expanded;
        setIcon(toggleIcon, expanded ? "chevron-down" : "chevron-right");

        if (expanded && !childrenContainer) {
          childrenContainer = container.createDiv("feishu-node-children");
          await this.loadAndRenderChildren(
            childrenContainer,
            this.selectedSpaceId,
            node.node_token,
            depth
          );
        } else if (childrenContainer) {
          childrenContainer.style.display = expanded ? "" : "none";
        }
      });
    }
  }

  private updateSelectedLabel(el: HTMLElement): void {
    const name = this.selectedNodeName || "（知识空间根部）";
    el.textContent = `已选: ${name}`;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
