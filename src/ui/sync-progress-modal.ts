/**
 * 批量同步进度弹窗
 *
 * 功能：
 * - 显示批量同步的实时进度（进度条 + 文件列表）
 * - 展示已完成/进行中/等待中的文件状态
 * - 支持取消同步
 */

import { App, Modal, setIcon } from "obsidian";

export class SyncProgressModal extends Modal {
  private progressBar: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;
  private fileListEl: HTMLElement | null = null;
  private statusItems = new Map<string, HTMLElement>();
  private cancelRequested = false;
  private onCancel?: () => void;

  constructor(app: App, private folderName: string) {
    super(app);
    // 禁止点击外部关闭
    this.modalEl.addClass("feishu-progress-modal");
  }

  get isCancelRequested(): boolean {
    return this.cancelRequested;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: `同步进度` });
    contentEl.createEl("p", {
      text: `正在同步: ${this.folderName}`,
      cls: "feishu-muted",
    });

    // 进度条
    const progressContainer = contentEl.createDiv("feishu-progress-container");
    this.progressBar = progressContainer.createDiv("feishu-progress-bar");
    this.progressBar.style.width = "0%";
    this.progressText = contentEl.createDiv({
      text: "准备中...",
      cls: "feishu-progress-text",
    });

    // 文件列表
    this.fileListEl = contentEl.createDiv("feishu-file-list");

    // 取消按钮
    const btnRow = contentEl.createDiv("feishu-btn-row");
    const cancelBtn = btnRow.createEl("button", { text: "取消同步" });
    cancelBtn.addEventListener("click", () => {
      this.cancelRequested = true;
      cancelBtn.disabled = true;
      cancelBtn.setText("正在取消...");
      this.onCancel?.();
    });
  }

  /**
   * 更新进度（由 SyncEngine 回调调用）
   *
   * 输入参数：
   * - done: 已完成数量
   * - total: 总数量
   * - currentFile: 当前正在处理的文件名
   */
  updateProgress(done: number, total: number, currentFile: string): void {
    if (!this.progressBar || !this.progressText) return;

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    this.progressBar.style.width = `${pct}%`;
    this.progressText.setText(
      done === total
        ? `完成: ${total} 个文件`
        : `${done} / ${total} 文件${currentFile ? `  —  ${currentFile}` : ""}`
    );

    // 标记当前文件为进行中
    if (currentFile) {
      this.setFileStatus(currentFile, "syncing");
    }
  }

  /**
   * 标记文件状态
   *
   * 输入参数：
   * - fileName: 文件名
   * - status: 'pending' | 'syncing' | 'done' | 'error'
   * - errorMsg: 错误信息（status 为 error 时传入）
   */
  setFileStatus(
    fileName: string,
    status: "pending" | "syncing" | "done" | "error",
    errorMsg?: string
  ): void {
    if (!this.fileListEl) return;

    let itemEl = this.statusItems.get(fileName);
    if (!itemEl) {
      itemEl = this.fileListEl.createDiv("feishu-file-item");
      this.statusItems.set(fileName, itemEl);
    }

    itemEl.empty();
    const iconEl = itemEl.createSpan("feishu-file-icon");
    const textEl = itemEl.createSpan({ text: fileName });

    switch (status) {
      case "syncing":
        setIcon(iconEl, "loader");
        itemEl.addClass("is-syncing");
        break;
      case "done":
        setIcon(iconEl, "check");
        itemEl.addClass("is-done");
        break;
      case "error":
        setIcon(iconEl, "x");
        itemEl.addClass("is-error");
        if (errorMsg) {
          textEl.title = errorMsg;
          itemEl.createSpan({ text: ` — ${errorMsg}`, cls: "feishu-error-msg" });
        }
        break;
      default:
        setIcon(iconEl, "circle");
    }
  }

  /** 设置取消回调 */
  setCancelCallback(cb: () => void): void {
    this.onCancel = cb;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
