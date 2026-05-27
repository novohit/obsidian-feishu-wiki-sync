# 测试与发布前检查

本文档用于发布前验证 Obsidian Feishu Wiki Sync。公众号、社群或公开仓库推广前，至少完成“自动检查”和“最小人工冒烟测试”。

## 自动检查

在仓库根目录执行：

```bash
npm install
npm run check
npm run lint
npm run build
npm audit --audit-level=moderate
```

通过标准：

- TypeScript 检查无错误。
- ESLint 无错误。
- 生成 `main.js`。
- `npm audit --audit-level=moderate` 无漏洞。

## 安装包检查

Obsidian 手动安装包只应包含：

```text
main.js
manifest.json
styles.css
```

不要发布：

- `node_modules/`
- `data.json`
- `.env`
- 用户 vault 内容
- Obsidian 工作区配置
- 源码 sourcemap

## Windows 安装验证

1. 准备一个测试 vault，例如 `D:\ObsidianPluginTestVault`。
2. 按 README 的 Windows 源码安装命令执行。
3. 确认插件目录存在：

```text
D:\ObsidianPluginTestVault\.obsidian\plugins\obsidian-feishu-wiki-sync\
```

4. 确认目录内有 `main.js`、`manifest.json`、`styles.css`。
5. 重启 Obsidian，启用「飞书知识库同步」。

## macOS 安装验证

1. 准备一个测试 vault，例如 `$HOME/Documents/ObsidianPluginTestVault`。
2. 按 README 的 macOS 源码安装命令执行。
3. 确认插件目录存在：

```text
$HOME/Documents/ObsidianPluginTestVault/.obsidian/plugins/obsidian-feishu-wiki-sync/
```

4. 确认目录内有 `main.js`、`manifest.json`、`styles.css`。
5. 重启 Obsidian，启用「飞书知识库同步」。

## 最小人工冒烟测试

使用测试知识空间，不要直接用生产知识空间。

1. 配置飞书 App ID 和 App Secret。
2. 点击「测试连接」，确认连接成功。
3. 选择测试知识空间和根节点。
4. 新建一篇只含标题和段落的 Markdown，手动同步。
5. 在飞书端确认文档已创建，标题和正文正确。
6. 修改 Obsidian 笔记，再手动同步，确认飞书端内容更新。
7. 检查 Obsidian 笔记 frontmatter 是否写入 `feishu_*` 字段。

## 功能测试矩阵

| 场景 | 测试内容 | 期望结果 |
|---|---|---|
| 基础 Markdown | 标题、段落、粗体、斜体、删除线、行内代码 | 飞书端结构可读 |
| 列表 | 有序、无序、任务列表、嵌套列表 | 层级尽量保留 |
| 代码块 | `js`、`ts`、`python`、无语言代码块 | 飞书端显示为代码块 |
| 引用和 Callout | 普通引用、Obsidian callout | 飞书端转换为可读引用 |
| 表格 | 简单表格和含管道符内容 | 以代码块保留 |
| Wikilink | `[[note]]`、`[[note\|display]]` | 转成显示文本 |
| 嵌入笔记 | `![[note]]` | 转成引用提示，不展开原文 |
| 网络图片 | `![](https://...)` | 上传到飞书云盘并显示 |
| 本地图片 | `![[image.png]]`、相对路径图片、中文文件名图片 | 上传到飞书云盘并显示 |
| 20MB+ 图片 | 超大图片 | 跳过或给出错误提示，不中断整体排查 |
| 多层目录 | `A/B/C/note.md` | 飞书知识库创建对应节点链 |
| 重名目录 | 不同目录下同名文件夹 | 不误绑定已有节点 |
| frontmatter 过滤 | 设置 `publish: true` 后同步有/无该字段的笔记 | 只同步匹配笔记 |
| 跳过已存在 | 更新策略选择跳过后再次同步 | 已有同步记录的笔记不覆盖 |
| 保存时自动同步 | 开启 on-save 后修改笔记 | 只触发一次同步，不因 frontmatter 写入循环同步 |
| 批量取消 | 批量同步中点击取消 | 后续文件停止同步 |

## 飞书权限排障

| 现象 | 优先检查 |
|---|---|
| 测试连接失败 | App ID、App Secret、应用是否发布 |
| 空间列表为空 | 应用是否加入知识空间，权限是否审批生效 |
| 403 或 permission denied | `wiki:wiki`、`docx:document`、`drive:drive` 是否已开通 |
| 图片上传失败 | `drive:drive` 权限、图片大小、网络图片是否可访问 |
| 文档写入失败 | `docx:document` 权限、知识空间写入权限、文档 revision 冲突 |

## Release 发布检查

1. 统一版本号：
   - `package.json`
   - `manifest.json`
   - `versions.json`
   - Git tag
   - Release 标题
2. 执行自动检查。
3. 确认 `main.js` 是最新构建产物。
4. 推送 tag：

```bash
git tag v0.1.0
git push origin v0.1.0
```

5. GitHub Actions 完成后，检查 Release 是否包含 `main.js`、`manifest.json`、`styles.css` 和 zip。
6. 从 Release 下载 zip，在新的测试 vault 中重新安装一次。
