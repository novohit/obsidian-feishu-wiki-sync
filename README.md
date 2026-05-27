# Obsidian Feishu Wiki Sync（飞书知识库同步）

一个将 Obsidian 笔记同步到飞书知识库的桌面端插件。插件会保留目录结构，支持可视化配置、连接测试、侧边栏选择性同步、批量同步、图片上传和 frontmatter 同步状态记录。

> 推荐从 GitHub Releases 安装。Release 尚未发布或需要最新源码时，可以按本文的 Windows/macOS 源码构建步骤安装。

## 适用环境

| 项目 | 要求 |
|---|---|
| Obsidian | 桌面端，`1.4.0` 或更高版本 |
| 系统 | Windows、macOS |
| 源码构建依赖 | Node.js `20+` 或 `22+`、npm、Git |
| 飞书 | 企业自建应用，具备知识库、文档和云盘权限 |

当前版本仅验证飞书中国区开放平台，暂未验证 Lark 国际版 endpoint。

## 功能特性

### 核心能力

- **可视化配置**：在 Obsidian 设置页填写飞书应用凭据，一键测试连接。
- **知识空间浏览器**：通过树形节点选择器选择目标知识空间或节点。
- **目录结构映射**：将 Obsidian 文件夹层级映射为飞书知识库节点树。
- **选择性同步**：侧边栏文件树支持勾选文件或文件夹。
- **批量同步**：批量同步时显示实时进度弹窗。
- **增量状态**：同步后在笔记 frontmatter 中记录飞书节点和最后同步时间。
- **图片处理**：支持网络图片和 Obsidian 本地图片上传到飞书云盘。

### 格式支持

| 格式 | 支持情况 |
|---|---|
| 标题 H1-H6 | 支持 |
| 段落、粗体、斜体、删除线 | 支持 |
| 行内代码、代码块 | 支持 |
| 有序/无序列表 | 支持，含嵌套 |
| Markdown 链接 | 支持 |
| 网络图片 `![](https://...)` | 自动下载并上传到飞书 |
| 本地图片 `![[image.png]]` | 自动上传到飞书云盘 |
| Wikilink `[[note\|display]]` | 转为显示文本 |
| 嵌入笔记 `![[note]]` | 转为引用提示 |
| Callout `> [!note]` | 转为加粗引用块 |
| 高亮 `==text==` | 转为加粗 |
| 任务列表 `- [x]` | 支持 |
| 引用块、分割线 | 支持 |
| 表格 | 以代码块形式保留 |

## 安装

### 方式 A：从 Release 安装

如果仓库的 [Releases](https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync/releases/latest) 页面已经有发布版本，使用这个方式最简单：

1. 下载最新 Release 中的 `main.js`、`manifest.json`、`styles.css`，或下载 zip 后解压。
2. 在你的 Obsidian vault 中创建插件目录：
   - Windows：`你的Vault\.obsidian\plugins\obsidian-feishu-wiki-sync\`
   - macOS：`你的Vault/.obsidian/plugins/obsidian-feishu-wiki-sync/`
3. 将 `main.js`、`manifest.json`、`styles.css` 放入该目录。
4. 打开 Obsidian：`设置 -> 第三方插件 -> 刷新/重启 Obsidian -> 启用「飞书知识库同步」`。

### 方式 B：Windows 从源码构建安装

如果 Release 页面为空，或者你希望安装最新源码版本，使用 PowerShell 执行：

```powershell
# 改成你的 Obsidian vault 根目录。示例：D:\ObsidianVault
$Vault = "D:\ObsidianVault"

$PluginId = "obsidian-feishu-wiki-sync"
$WorkDir = Join-Path $env:TEMP $PluginId
$PluginDir = Join-Path $Vault ".obsidian\plugins\$PluginId"

if (!(Test-Path -LiteralPath $Vault)) {
  throw "Vault 路径不存在：$Vault。请先把 `$Vault 改成你的 Obsidian vault 根目录。"
}

if (Test-Path -LiteralPath $WorkDir) {
  Remove-Item -LiteralPath $WorkDir -Recurse -Force
}

git clone https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git $WorkDir
Set-Location -LiteralPath $WorkDir

npm install
npm run build

New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item -LiteralPath ".\main.js" -Destination (Join-Path $PluginDir "main.js") -Force
Copy-Item -LiteralPath ".\manifest.json" -Destination (Join-Path $PluginDir "manifest.json") -Force
Copy-Item -LiteralPath ".\styles.css" -Destination (Join-Path $PluginDir "styles.css") -Force

Get-ChildItem -LiteralPath $PluginDir
```

安装后重启 Obsidian，或在第三方插件页面刷新插件列表，然后启用「飞书知识库同步」。

### 方式 C：macOS 从源码构建安装

如果 Release 页面为空，或者你希望安装最新源码版本，使用 Terminal 执行：

```bash
# 改成你的 Obsidian vault 根目录。示例：$HOME/Documents/MyVault
VAULT="$HOME/Documents/MyVault"

PLUGIN_ID="obsidian-feishu-wiki-sync"
WORK_DIR="${TMPDIR:-/tmp}/${PLUGIN_ID}"
PLUGIN_DIR="$VAULT/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT" ]; then
  echo "Vault 路径不存在：$VAULT。请先把 VAULT 改成你的 Obsidian vault 根目录。"
  exit 1
fi

rm -rf "$WORK_DIR"
git clone https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git "$WORK_DIR"
cd "$WORK_DIR"

npm install
npm run build

mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"

ls -la "$PLUGIN_DIR"
```

安装后重启 Obsidian，或在第三方插件页面刷新插件列表，然后启用「飞书知识库同步」。

### 给 AI 的安装提示词

你可以把下面这段和仓库链接一起发给 AI：

```text
请根据 README 帮我安装 Obsidian Feishu Wiki Sync。我的系统是 Windows/macOS，我的 Obsidian vault 路径是：<填写你的 vault 路径>。如果 Releases 有 main.js、manifest.json、styles.css，就优先下载 Release；如果没有 Release，就从源码 git clone、npm install、npm run build，然后把 main.js、manifest.json、styles.css 复制到 vault 的 .obsidian/plugins/obsidian-feishu-wiki-sync/ 目录。安装前先确认 Node.js、npm、Git 可用，安装后告诉我如何在 Obsidian 中启用插件。
```

## 飞书配置

### 第一步：创建飞书自建应用

1. 打开 [飞书开放平台](https://open.feishu.cn)。
2. 创建 **企业自建应用**。
3. 在 **权限管理** 页面开通以下权限。

| 权限 | 用途 |
|---|---|
| `wiki:wiki` | 知识库读写，创建节点、读取节点、写入文档 |
| `docx:document` | 文档读写，进行 Block 级别内容操作 |
| `drive:drive` | 云盘文件上传，用于图片上传 |

4. 在 **版本管理与发布** 中发布应用。

### 第二步：将应用加入知识空间

飞书知识空间通常不能直接把应用作为普通成员加入，可以使用以下方式之一：

1. 创建一个包含该应用机器人的飞书群。
2. 在知识空间设置中添加该群为管理员。

或者：

1. 打开目标知识空间。
2. 点击右上角 `...`。
3. 选择添加文档应用，并搜索你的应用名称。

### 第三步：在 Obsidian 中配置

1. 打开 `设置 -> 第三方插件 -> 飞书知识库同步`。
2. 填写飞书应用的 **App ID** 和 **App Secret**。
3. 点击 **测试连接**。
4. 点击 **浏览并选择**，选择目标知识空间和根节点。
5. 首次建议保持 **手动同步**，确认效果后再考虑保存时自动同步。

## 使用方法

### 侧边栏面板

点击左侧 ribbon 栏的云上传图标，打开飞书同步侧边栏：

- 文件夹树展示 vault 中的 Markdown 文件。
- 勾选文件或文件夹，文件夹会级联选中子文件。
- 过滤栏可切换全部、待更新、未同步。
- 搜索框可按文件名或路径搜索。
- 点击同步按钮批量同步所选文件。

### 右键菜单

- 右键 `.md` 文件，选择 **同步到飞书知识库**。
- 右键文件夹，选择 **同步文件夹到飞书知识库**。

### 命令面板

按 `Ctrl+P` 或 `Cmd+P`，可使用：

- `飞书知识库同步: 同步当前笔记到飞书知识库`
- `飞书知识库同步: 打开飞书同步面板`
- `飞书知识库同步: 测试飞书连接`
- `飞书知识库同步: 打开飞书知识库同步设置`

## 同步元数据

同步成功后，插件会在笔记 frontmatter 中写入飞书同步元数据：

```yaml
---
feishu_wiki_space: "<feishu_wiki_space_id>"
feishu_wiki_node: "<feishu_wiki_node_token>"
feishu_doc_token: "<feishu_doc_token>"
feishu_last_sync: "<iso_datetime>"
feishu_doc_revision: 3
---
```

后续再次同步同一文件时，插件会根据这些字段定位飞书端文档。

## 安全说明

- 插件使用飞书 `tenant_access_token`，不依赖第三方 OAuth 中继服务。
- `App ID`、`App Secret` 和缓存 token 存储在 Obsidian 本地插件数据文件 `data.json` 中。
- `data.json` 不应提交到公开仓库，也不应分享给他人。
- 同步成功后写入笔记 frontmatter 的 `feishu_*` 字段包含飞书空间、节点和文档标识；公开发布 vault 或截图前请先脱敏。
- 所有飞书 API 调用走 HTTPS。
- 当前默认写入策略会覆盖飞书端同一文档内容；正式批量同步前建议先用测试节点验证。

## 常见问题

### Release 页面为空怎么办？

直接使用“从源码构建安装”的 Windows 或 macOS 命令。源码安装会在本机生成 `main.js`，再复制到 Obsidian 插件目录。

### Obsidian 看不到插件怎么办？

检查插件目录中是否有这三个文件：

```text
.obsidian/plugins/obsidian-feishu-wiki-sync/main.js
.obsidian/plugins/obsidian-feishu-wiki-sync/manifest.json
.obsidian/plugins/obsidian-feishu-wiki-sync/styles.css
```

然后重启 Obsidian，或在第三方插件页面刷新插件列表。

### 测试连接失败怎么办？

依次检查：

1. App ID 和 App Secret 是否来自同一个飞书自建应用。
2. 应用是否已经发布。
3. 权限是否包含 `wiki:wiki`、`docx:document`、`drive:drive`。
4. 应用是否已加入目标知识空间。

### 可以自动同步吗？

可以。设置中的同步模式支持手动和保存时自动同步。首次使用建议先手动同步，确认目标知识空间、目录结构和覆盖行为符合预期后，再开启保存时自动同步。

## 开发

```bash
npm install
npm run check
npm run lint
npm run build
npm run dev
```

构建产物 `main.js` 会输出到项目根目录。手动安装时只需要复制 `main.js`、`manifest.json`、`styles.css`。

完整发布前测试矩阵见 [TESTING.md](./TESTING.md)。

完整使用教程见 [docs/TUTORIAL.md](./docs/TUTORIAL.md)。

## 发布维护

发布前检查：

```bash
npm install
npm run check
npm run lint
npm run build
```

创建 GitHub Release：

```bash
git tag v0.2.0
git push origin v0.2.0
```

推送 tag 后，GitHub Actions 会自动构建并发布 Release，包含：

- `main.js`
- `manifest.json`
- `styles.css`
- `obsidian-feishu-wiki-sync-v0.2.0.zip`

## 项目架构

```text
src/
├── main.ts                    # 插件入口，生命周期、命令/菜单注册
├── settings/
│   ├── settings-types.ts      # 设置项类型定义和默认值
│   └── settings-tab.ts        # 设置页面 UI
├── feishu/
│   ├── auth.ts                # 飞书认证
│   ├── wiki-api.ts            # 知识库 API
│   ├── doc-api.ts             # 文档 Block API
│   ├── drive-api.ts           # 云盘上传 API
│   ├── rate-limiter.ts        # API 频率控制
│   └── types.ts               # 飞书 API 类型定义
├── converter/
│   ├── markdown-to-blocks.ts  # Markdown 转飞书 Block
│   └── image-resolver.ts      # 图片路径解析和上传
├── sync/
│   ├── sync-engine.ts         # 同步核心
│   └── sync-state.ts          # frontmatter 同步状态管理
└── ui/
    ├── sync-sidebar-view.ts   # 侧边栏面板
    ├── wiki-browser-modal.ts  # 知识空间节点浏览器弹窗
    └── sync-progress-modal.ts # 批量同步进度弹窗
```

## 与竞品的对比

| 特性 | 本插件 | FeishuShare | ObShare | ob2feishu |
|---|---|---|---|---|
| 目录结构保留 | 自动映射 | 不支持 | 不支持 | 手动 |
| 第三方中继 | 无 | 依赖 md2feishu.xinqi.life | 无 | 无 |
| 文档更新方式 | Block API 直接构建 | import-then-patch | N/A | N/A |
| 连接测试 | 支持 | 无 | 无 | 无 |
| 侧边栏面板 | 文件夹树 + checkbox | 无 | 无 | 无 |
| Obsidian 语法 | wikilink/callout/embed 适配 | 部分 | 部分 | 部分 |
| 类型 | Obsidian 插件 | Obsidian 插件 | Obsidian 插件 | Python CLI |

## License

MIT
