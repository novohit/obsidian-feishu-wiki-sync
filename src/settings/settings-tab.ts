/**
 * 插件设置页面（PluginSettingTab）
 *
 * 功能：
 * - App ID / App Secret 输入（Secret 以密码形式显示）
 * - 连接测试按钮（显示连接状态）
 * - 知识空间选择（下拉 + 浏览按钮）
 * - 同步规则配置
 * - 高级设置
 */

import { App, PluginSettingTab, Setting, setIcon, Notice } from "obsidian";
import type FeishuWikiPlugin from "../main";
import { WikiBrowserModal } from "../ui/wiki-browser-modal";

export class FeishuWikiSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: FeishuWikiPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ── 标题 ────────────────────────────────────────
    containerEl.createEl("h2", { text: "飞书知识库同步" });

    // ── 飞书应用配置 ─────────────────────────────────
    containerEl.createEl("h3", { text: "飞书应用配置" });

    new Setting(containerEl)
      .setName("App ID")
      .setDesc("飞书开放平台自建应用的 App ID")
      .addText((text) =>
        text
          .setPlaceholder("cli_xxxxxxxxxxxxxxxx")
          .setValue(this.plugin.settings.appId)
          .onChange(async (value) => {
            this.plugin.settings.appId = value.trim();
            this.plugin.auth.updateCredentials(
              this.plugin.settings.appId,
              this.plugin.settings.appSecret
            );
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("App Secret")
      .setDesc("飞书开放平台自建应用的 App Secret")
      .addText((text) => {
        text
          .setPlaceholder("••••••••••••••••")
          .setValue(this.plugin.settings.appSecret)
          .onChange(async (value) => {
            this.plugin.settings.appSecret = value.trim();
            this.plugin.auth.updateCredentials(
              this.plugin.settings.appId,
              this.plugin.settings.appSecret
            );
            await this.plugin.saveSettings();
          });
        // 设置密码类型输入框
        text.inputEl.type = "password";
        return text;
      });

    // ── 连接状态 ─────────────────────────────────────
    const connectionSetting = new Setting(containerEl)
      .setName("连接状态")
      .setDesc("验证飞书应用配置是否正确");

    const statusEl = connectionSetting.descEl.createSpan({
      cls: "feishu-connection-status",
    });
    this.updateConnectionStatusDisplay(statusEl);

    connectionSetting.addButton((btn) => {
      btn.setButtonText("测试连接").onClick(async () => {
        btn.setButtonText("连接中...").setDisabled(true);
        statusEl.setText("");

        const result = await this.plugin.auth.testConnection();

        btn.setButtonText("测试连接").setDisabled(false);
        this.plugin.settings.cachedToken = result.success
          ? (await this.plugin.auth.getToken().catch(() => ""))
          : "";
        await this.plugin.saveSettings();

        if (result.success) {
          statusEl.setText("● 连接成功");
          statusEl.className = "feishu-connection-status feishu-status-success";
          // 刷新知识空间下拉列表
          this.display();
        } else {
          statusEl.setText(`● ${result.message}`);
          statusEl.className = "feishu-connection-status feishu-status-error";
          new Notice(`连接失败: ${result.message}`, 5000);
        }
      });
    });

    // ── 同步目标 ─────────────────────────────────────
    containerEl.createEl("h3", { text: "同步目标" });

    new Setting(containerEl)
      .setName("默认知识空间")
      .setDesc(
        this.plugin.settings.defaultSpaceName
          ? `已选: ${this.plugin.settings.defaultSpaceName}`
          : "请先测试连接，再选择知识空间"
      )
      .addButton((btn) => {
        btn.setButtonText("浏览并选择").onClick(async () => {
          if (!this.plugin.settings.cachedToken) {
            new Notice("请先完成连接测试", 3000);
            return;
          }

          new WikiBrowserModal(
            this.app,
            this.plugin.wikiApi,
            this.plugin.settings.defaultSpaceId,
            this.plugin.settings.defaultSpaceName,
            async (result) => {
              if (!result) return;
              this.plugin.settings.defaultSpaceId = result.spaceId;
              this.plugin.settings.defaultSpaceName = result.spaceName;
              this.plugin.settings.defaultParentNodeToken = result.nodeToken;
              this.plugin.settings.defaultParentNodeName = result.nodeName;
              await this.plugin.saveSettings();
              // 刷新设置页面以显示最新选择
              this.display();
            }
          ).open();
        });
      });

    if (this.plugin.settings.defaultSpaceName) {
      new Setting(containerEl)
        .setName("根节点")
        .setDesc(
          `同步到: ${this.plugin.settings.defaultParentNodeName || "（知识空间根部）"}`
        )
        .addButton((btn) =>
          btn.setButtonText("更改").onClick(async () => {
            if (!this.plugin.settings.cachedToken) {
              new Notice("请先完成连接测试", 3000);
              return;
            }
            new WikiBrowserModal(
              this.app,
              this.plugin.wikiApi,
              this.plugin.settings.defaultSpaceId,
              this.plugin.settings.defaultSpaceName,
              async (result) => {
                if (!result) return;
                this.plugin.settings.defaultParentNodeToken = result.nodeToken;
                this.plugin.settings.defaultParentNodeName = result.nodeName;
                await this.plugin.saveSettings();
                this.display();
              }
            ).open();
          })
        );
    }

    // ── 同步规则 ─────────────────────────────────────
    containerEl.createEl("h3", { text: "同步规则" });

    new Setting(containerEl)
      .setName("同步模式")
      .setDesc("手动同步：通过右键菜单/命令触发；自动同步：保存文件时自动推送")
      .addDropdown((dd) =>
        dd
          .addOption("manual", "手动同步")
          .addOption("on-save", "保存时自动同步")
          .setValue(this.plugin.settings.syncMode)
          .onChange(async (value) => {
            this.plugin.settings.syncMode = value as "manual" | "on-save";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Frontmatter 过滤字段")
      .setDesc(
        "只同步包含此 frontmatter 字段的笔记（如 publish: true）。留空则不过滤"
      )
      .addText((text) =>
        text
          .setPlaceholder("publish: true")
          .setValue(this.plugin.settings.frontmatterFilter)
          .onChange(async (value) => {
            this.plugin.settings.frontmatterFilter = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("排除文件夹")
      .setDesc("批量同步时跳过的文件夹（英文逗号分隔）")
      .addText((text) =>
        text
          .setPlaceholder("templates, .trash, drafts")
          .setValue(this.plugin.settings.excludeFolders)
          .onChange(async (value) => {
            this.plugin.settings.excludeFolders = value;
            await this.plugin.saveSettings();
          })
      );

    // ── 高级设置 ─────────────────────────────────────
    containerEl.createEl("h3", { text: "高级设置" });

    new Setting(containerEl)
      .setName("自动上传本地图片")
      .setDesc("同步时将笔记中引用的本地图片上传到飞书云盘")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.uploadLocalImages)
          .onChange(async (value) => {
            this.plugin.settings.uploadLocalImages = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("更新策略")
      .setDesc("笔记已同步时的处理方式")
      .addDropdown((dd) =>
        dd
          .addOption("overwrite", "覆盖飞书端内容")
          .addOption("skip-if-exists", "跳过（保留飞书端版本）")
          .setValue(this.plugin.settings.updateStrategy)
          .onChange(async (value) => {
            this.plugin.settings.updateStrategy = value as "overwrite" | "skip-if-exists";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("调试日志")
      .setDesc("在控制台输出详细日志（排查问题时使用）")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.debugLog)
          .onChange(async (value) => {
            this.plugin.settings.debugLog = value;
            await this.plugin.saveSettings();
          })
      );

    // ── 飞书权限说明 ─────────────────────────────────
    containerEl.createEl("h3", { text: "配置帮助" });
    const helpEl = containerEl.createDiv("feishu-help-block");
    helpEl.createEl("p", { text: "需要在飞书开放平台为应用申请以下权限：" });
    const permList = helpEl.createEl("ul");
    [
      "wiki:wiki — 知识库读写",
      "docx:document — 文档读写",
      "drive:drive — 云盘文件上传",
    ].forEach((perm) => permList.createEl("li", { text: perm }));

    helpEl.createEl("p", {
      text: "申请权限后，还需要在知识空间设置中将应用添加为成员（管理员权限）",
      cls: "feishu-muted",
    });
  }

  private updateConnectionStatusDisplay(el: HTMLElement): void {
    const { settings } = this.plugin;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isConnected =
      settings.cachedToken &&
      settings.tokenExpireAt > nowSeconds + 60;

    if (isConnected) {
      el.setText("● 已连接");
      el.addClass("feishu-status-success");
    } else if (settings.appId && settings.appSecret) {
      el.setText("○ 未连接（点击测试连接）");
    } else {
      el.setText("○ 未配置");
    }
  }
}
