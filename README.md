# Obsidian Feishu Wiki Sync（飞书知识库同步）

把 Obsidian Markdown 笔记同步到飞书知识库的桌面端插件。插件支持连接测试、知识空间选择、侧边栏批量同步、目录结构映射、图片上传和 frontmatter 同步状态记录。

**默认推荐安装方式：让 AI 或你自己按本文从源码构建安装。Release 不是必需条件。**

## 适用环境

| 项目 | 要求 |
|---|---|
| Obsidian | 桌面端，`1.4.0` 或更高版本 |
| 系统 | Windows、macOS |
| 源码构建依赖 | Node.js `20+` 或 `22+`、npm、Git |
| 飞书 | 企业自建应用，具备知识库、文档和云盘权限 |

当前版本只验证飞书中国区开放平台 `open.feishu.cn`，暂未验证 Lark 国际版 endpoint。

## 快速给 AI 的安装提示词

把下面这段和仓库链接一起发给 AI：

```text
请帮我安装这个 Obsidian 插件：Obsidian Feishu Wiki Sync。

我的系统是：Windows/macOS。
我的 Obsidian vault 路径是：<填写你的 vault 路径>。

请按 README 从源码安装：
1. 确认本机有 Node.js、npm、Git。
2. 使用我提供的 GitHub 仓库地址 git clone 到临时目录。
3. 运行 npm install。
4. 运行 npm run build。
5. 把生成的 main.js、manifest.json、styles.css 复制到：
   <我的 vault>/.obsidian/plugins/obsidian-feishu-wiki-sync/
6. 告诉我如何在 Obsidian 里关闭安全模式、启用第三方插件、启用「飞书知识库同步」。

不要把源码目录、node_modules 或 data.json 复制进插件目录。
插件目录下应该直接包含 main.js、manifest.json、styles.css。
```

## 安装

### 前置检查

先确认本机已经安装 Node.js、npm 和 Git。

Windows PowerShell 或 macOS Terminal 都可以执行：

```bash
node -v
npm -v
git --version
```

要求：

- Node.js 建议 `20+` 或 `22+`
- npm 随 Node.js 一起安装
- Git 能正常 clone GitHub 仓库

如果 `node`、`npm` 或 `git` 提示找不到命令，先安装缺失组件，再重新打开终端：

| 系统 | 推荐处理 |
|---|---|
| Windows | 安装 Node.js LTS 和 Git for Windows；也可以使用 `winget install OpenJS.NodeJS.LTS`、`winget install Git.Git` |
| macOS | 安装 Node.js LTS 和 Git；也可以使用 Homebrew 执行 `brew install node git` |

如果 `git clone` 失败，先确认仓库地址可以在浏览器打开，再检查 GitHub 网络访问、代理或公司网络限制。

### Windows：从源码构建安装

在 PowerShell 里执行。先把 `$Vault` 改成你的 Obsidian vault 根目录。

```powershell
$RepoUrl = "https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git"
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

git clone $RepoUrl $WorkDir
Set-Location -LiteralPath $WorkDir

npm install
npm run build

if (!(Test-Path -LiteralPath ".\main.js")) {
  throw "构建失败：项目根目录没有生成 main.js。请检查 npm run build 输出。"
}

New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item -LiteralPath ".\main.js" -Destination (Join-Path $PluginDir "main.js") -Force
Copy-Item -LiteralPath ".\manifest.json" -Destination (Join-Path $PluginDir "manifest.json") -Force
Copy-Item -LiteralPath ".\styles.css" -Destination (Join-Path $PluginDir "styles.css") -Force

Get-ChildItem -LiteralPath $PluginDir
```

安装后打开 Obsidian：

1. `设置 -> 第三方插件`
2. 关闭安全模式
3. 刷新或重启 Obsidian
4. 启用「飞书知识库同步」

### macOS：从源码构建安装

在 Terminal 里执行。先把 `VAULT` 改成你的 Obsidian vault 根目录。

```bash
REPO_URL="https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git"
VAULT="$HOME/Documents/MyVault"

PLUGIN_ID="obsidian-feishu-wiki-sync"
WORK_DIR="${TMPDIR:-/tmp}/${PLUGIN_ID}"
PLUGIN_DIR="$VAULT/.obsidian/plugins/$PLUGIN_ID"

if [ ! -d "$VAULT" ]; then
  echo "Vault 路径不存在：$VAULT。请先把 VAULT 改成你的 Obsidian vault 根目录。"
  exit 1
fi

rm -rf "$WORK_DIR"
git clone "$REPO_URL" "$WORK_DIR"
cd "$WORK_DIR"

npm install
npm run build

if [ ! -f "main.js" ]; then
  echo "构建失败：项目根目录没有生成 main.js。请检查 npm run build 输出。"
  exit 1
fi

mkdir -p "$PLUGIN_DIR"
cp main.js manifest.json styles.css "$PLUGIN_DIR/"

ls -la "$PLUGIN_DIR"
```

安装后打开 Obsidian：

1. `Settings -> Community plugins`
2. 关闭 Restricted mode
3. Reload 或重启 Obsidian
4. 启用「飞书知识库同步」

## 飞书配置

完整跑通需要三层权限：

```text
App ID / App Secret 正确
  -> 飞书开放平台 API 权限已开通
  -> 目标知识库给这个应用或应用所在群授权
```

### 1. 创建飞书自建应用

1. 打开 [飞书开放平台](https://open.feishu.cn)。
2. 创建 **企业自建应用**。
3. 复制应用的 **App ID** 和 **App Secret**。
4. 在 **权限管理** 里开通以下权限。

| 权限 | 用途 |
|---|---|
| `wiki:wiki` | 列出知识空间、读取节点、创建知识库节点 |
| `docx:document` | 读取文档信息、删除旧 Block、写入新的 Docx Block |
| `drive:drive` | 上传本地图片或网络图片到飞书云盘 |

5. 在 **版本管理与发布** 中发布应用。

注意：只点「测试连接」成功，只说明 App ID / App Secret 正确，不代表应用已经能访问目标知识库。

如果企业管理员开启了权限审批，权限申请和应用发布可能需要审批或等待几分钟生效。遇到刚发布后仍失败的情况，先刷新开放平台应用版本，再重新打开 Obsidian 测试。

### 2. 给目标知识库授权

这是最容易卡住的一步。

插件调用的是飞书 Wiki API。目标知识库必须给这个应用空间级访问权限，否则 Obsidian 里可能只能看到其他已授权知识库，或者看不到目标知识库。

推荐优先级：

**优先方式：直接添加文档应用**

1. 打开目标飞书知识库。
2. 找到知识库设置、成员设置或右上角更多菜单。
3. 使用「添加文档应用」或类似入口。
4. 搜索你的自建应用名称。
5. 授予可编辑或管理员权限。

**备用方式：通过群组授权**

1. 创建一个飞书群。
2. 把这个自建应用的机器人加入该群。
3. 打开目标飞书知识库。
4. 进入知识库设置或成员设置。
5. 添加这个群为管理员或可编辑成员。

也可以在知识库里通过「添加文档应用」直接添加该自建应用。不同飞书租户 UI 可能略有差异，以知识库设置里的权限入口为准。

判断标准：

| 状态 | 含义 |
|---|---|
| Obsidian 测试连接成功 | App ID / App Secret 正确 |
| 浏览并选择时能看到目标知识库 | 知识库空间权限正确 |
| 能选中根节点或子节点 | Wiki 节点读取权限正确 |
| 能同步一篇测试笔记 | 写入文档和创建节点权限正确 |

### 3. 在 Obsidian 中配置插件

打开：

```text
设置 -> 第三方插件 -> 飞书知识库同步
```

填写：

```text
App ID
App Secret
```

然后按顺序操作：

1. 点击 **测试连接**。
2. 点击 **浏览并选择**。
3. 选择目标知识空间。
4. 选择目标节点，首次建议选知识空间根部或专门的测试节点。
5. 同步模式先保持 **手动同步**。

首次不要直接全库同步。建议先同步一篇测试笔记。

插件里还有这些配置项：

| 配置项 | 建议 |
|---|---|
| 同步模式 | 首次使用保持手动同步；确认稳定后再考虑保存时自动同步 |
| Frontmatter 过滤字段 | 如果只想同步公开笔记，可填 `publish: true` |
| 排除文件夹 | 默认排除 `templates, .trash`，可加 `drafts` 等 |
| 自动上传本地图片 | 需要图片同步时开启；图片异常时可先关闭排查正文同步 |
| 更新策略 | 默认覆盖飞书端；不想覆盖已有文档时选跳过 |
| 调试日志 | 排错时再开启 |

提醒：`App Secret` 和缓存 token 会写入本地插件数据文件：

```text
<你的 vault>/.obsidian/plugins/obsidian-feishu-wiki-sync/data.json
```

不要提交或公开这个文件。

## 首次同步建议

新建一篇测试笔记：

```markdown
# Feishu Sync Test

这是一篇同步测试笔记。

- 支持列表
- 支持 **加粗**
- 支持 `inline code`
```

右键这篇笔记，选择「同步到飞书知识库」。

在飞书端确认：

1. 目标知识库中出现了文档。
2. 标题正确。
3. 正文可读。
4. 再次同步不会重复创建新文档。

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

这些字段用于记录 Obsidian 笔记和飞书文档之间的映射关系。不要随意删除，否则后续同步可能重复创建文档。

## 隐私与安全

- 插件使用飞书 `tenant_access_token`，不依赖第三方 OAuth 中继服务。
- `App ID`、`App Secret` 和缓存 token 存储在 Obsidian 本地插件数据文件 `data.json` 中。
- 不要公开 `.obsidian/plugins/obsidian-feishu-wiki-sync/data.json`。
- 同步成功后写入笔记 frontmatter 的 `feishu_*` 字段包含飞书空间、节点和文档标识。
- 公开发布 vault、截图或报错日志前，请先脱敏 App Secret、token、飞书 URL、空间 ID、文档 token、头像和企业域名。
- 当前默认写入策略会覆盖飞书端同一文档内容；正式批量同步前建议先用测试节点验证。

## 常见问题

### 最小排错树

```text
测试连接失败
  -> 先查 App ID / App Secret 是否填错
  -> 再查应用是否已经发布
  -> 再查 API 权限是否已审批并生效

测试连接成功，但看不到目标知识库
  -> App 身份正确，但目标知识库没有授权
  -> 去知识库设置添加文档应用，或把应用所在群加入知识库

能看到知识库，但同步时报 403
  -> 目标节点不可编辑，或 wiki/docx 权限不足
  -> 给应用可编辑/管理员权限，并确认 `wiki:wiki`、`docx:document` 已开通

文字能同步，但图片失败
  -> 优先检查 `drive:drive` 权限
  -> 再检查图片路径、图片大小和网络访问
```

| 现象 | 大概率原因 | 处理方式 |
|---|---|---|
| 测试连接失败 | App ID / App Secret 错误，应用未发布，或权限审批未生效 | 回飞书开放平台检查凭证、权限和应用版本 |
| 测试连接成功，但看不到目标知识库 | 目标知识库没有给应用空间级权限 | 在知识库设置中添加文档应用，或把应用所在群加为可编辑/管理员 |
| 同步时报 403 | API 权限或目标节点编辑权限不足 | 检查 `wiki:wiki`、`docx:document`、知识库成员权限 |
| 图片上传失败 | `drive:drive` 权限缺失、图片过大、路径不正确 | 先用无图片笔记测试，再检查图片路径和权限 |
| 同步后重复创建文档 | `feishu_*` frontmatter 被删除，或切换了目标节点 | 保留同步元数据，固定目标知识空间和节点 |
| Obsidian 看不到插件 | 插件目录层级错误或未重启 | 确认插件目录下直接有三件套 |

### 测试连接成功，但看不到目标知识库

大概率是知识库本身没给应用权限。去目标知识库设置里，把应用或包含应用机器人的群加为管理员或可编辑成员。

### Obsidian 看不到插件

检查插件目录中是否有这三个文件：

```text
.obsidian/plugins/obsidian-feishu-wiki-sync/main.js
.obsidian/plugins/obsidian-feishu-wiki-sync/manifest.json
.obsidian/plugins/obsidian-feishu-wiki-sync/styles.css
```

如果目录中多了一层源码目录，例如：

```text
.obsidian/plugins/obsidian-feishu-wiki-sync/obsidian-feishu-wiki-sync/main.js
```

就是装错层级了。

### 可以自动同步吗？

可以，但首次使用建议先手动同步。确认目标知识空间、目录结构、权限和覆盖行为符合预期后，再开启保存时自动同步。

### 飞书端内容会被覆盖吗？

会。当前插件以 Obsidian 为源头，同步时会覆盖飞书端同一文档内容。不要在飞书端长期手动编辑同一篇同步文档。

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

## License

MIT
