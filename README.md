# Obsidian Feishu Wiki Sync (飞书知识库同步)

将 Obsidian 笔记同步到飞书知识库的 Obsidian 插件。保留目录结构，支持可视化配置、连接测试、选择性同步。

## 功能特性

### 核心能力

- **可视化配置** — 在 Obsidian 设置页面填写飞书应用凭据，一键测试连接
- **知识空间浏览器** — 树形节点选择器，选择同步到哪个知识空间/节点
- **目录结构映射** — 文件夹层级自动保留为飞书知识库节点树
- **选择性同步** — 侧边栏文件夹树，checkbox 勾选要同步的文件/文件夹
- **批量同步** — 勾选多个文件/文件夹后一键同步，带实时进度弹窗
- **增量更新** — frontmatter 记录同步状态，只更新有变化的文件
- **同步状态面板** — 侧边栏显示已同步/待更新/未同步的文件统计

### 格式支持

| 格式 | 支持情况 |
|------|---------|
| 标题 H1-H6 | 完整支持 |
| 段落、粗体、斜体、删除线 | 完整支持 |
| 行内代码、代码块（含语言高亮） | 完整支持 |
| 有序/无序列表 | 支持（含嵌套） |
| 链接 `[text](url)` | 完整支持 |
| 网络图片 `![](https://...)` | 自动下载并上传到飞书 |
| 本地图片 `![[image.png]]` | 自动上传到飞书云盘 |
| Wikilink `[[note\|display]]` | 转为显示文本 |
| 嵌入笔记 `![[note]]` | 转为引用块提示 |
| Callout `> [!note]` | 转为加粗引用块 |
| 高亮 `==text==` | 转为加粗 |
| 任务列表 `- [x]` | 完整支持 |
| 引用块 | 完整支持 |
| 分割线 | 完整支持 |
| 表格 | 以代码块形式保留 |

### 安全特性

- 使用 `tenant_access_token`，不依赖任何第三方 OAuth 中继服务
- 凭据存储在 Obsidian 本地 `data.json`，不上传到任何外部服务
- Token 仅在内存中缓存，自动刷新
- 所有 API 调用走 HTTPS

## 安装

### 手动安装

1. 从 [Releases](../../releases) 下载最新版本的 `main.js`、`manifest.json`、`styles.css`
2. 在你的 Obsidian vault 中创建目录 `.obsidian/plugins/obsidian-feishu-wiki-sync/`
3. 将下载的三个文件放入该目录
4. 在 Obsidian 中：设置 → 第三方插件 → 刷新 → 启用「飞书知识库同步」

### 从源码构建

```bash
git clone https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git
cd obsidian-feishu-wiki-sync
npm install
npm run build
# 将 main.js、manifest.json、styles.css 复制到你的 vault 插件目录
```

## 配置步骤

### 第一步：创建飞书自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 创建 **企业自建应用**
3. 在 **权限管理** 页面开通以下权限：

| 权限 | 用途 |
|------|------|
| `wiki:wiki` | 知识库读写（创建节点、写入文档） |
| `docx:document` | 文档读写（Block 级别内容操作） |
| `drive:drive` | 云盘文件上传（图片上传） |

4. 在 **版本管理与发布** 中发布应用

### 第二步：将应用添加到知识空间

飞书知识空间不能直接添加应用为成员，需要通过群组中转：

1. 创建一个包含该应用机器人的飞书群
2. 在知识空间设置 → 成员设置 → 添加管理员 → 搜索该群名
3. 将群添加为知识空间管理员

> 或者：在知识空间页面 → 右上角「...」→「添加文档应用」→ 搜索应用名

### 第三步：在 Obsidian 中配置

1. 打开 Obsidian 设置 → 第三方插件 → 飞书知识库同步
2. 填写 **App ID** 和 **App Secret**
3. 点击 **「测试连接」**，成功后显示绿色状态
4. 点击 **「浏览并选择」**，选择目标知识空间和根节点

## 使用方法

### 侧边栏面板

点击左侧 ribbon 栏的云上传图标，打开飞书同步侧边栏：

- **文件夹树** — 以树形结构展示 vault 中所有 markdown 文件
- **复选框** — 勾选要同步的文件/文件夹，文件夹勾选会级联选中所有子文件
- **过滤栏** — 快速切换：全部 / 待更新 / 未同步
- **搜索框** — 按文件名/路径搜索
- **同步按钮** — 点击「同步 (N)」批量同步所有勾选文件

### 右键菜单

- 右键 `.md` 文件 → **「同步到飞书知识库」**
- 右键文件夹 → **「同步文件夹到飞书知识库」**

### 命令面板 (Ctrl+P)

- `飞书知识库同步: 同步当前笔记到飞书知识库`
- `飞书知识库同步: 打开飞书同步面板`
- `飞书知识库同步: 测试飞书连接`
- `飞书知识库同步: 打开飞书知识库同步设置`

### 同步后的效果

同步成功后，Obsidian 会在文件的 frontmatter 中自动写入同步元数据：

```yaml
---
feishu_wiki_space: "7627001732052044764"
feishu_wiki_node: "XhSzw3TH9iD4jHkVHl4ca9pjnVd"
feishu_doc_token: "GaO8d5h5ZoyxcwxN1OvcfGltnue"
feishu_last_sync: "2026-04-10T12:00:00.000Z"
feishu_doc_revision: 3
---
```

后续修改该文件后再次同步，会覆盖更新飞书端的内容。

## 项目架构

```
src/
├── main.ts                    # 插件入口，生命周期、命令/菜单注册
├── settings/
│   ├── settings-types.ts      # 设置项类型定义 + 默认值
│   └── settings-tab.ts        # 设置页面 UI (PluginSettingTab)
├── feishu/
│   ├── auth.ts                # 飞书认证 (tenant_access_token, 自动刷新)
│   ├── wiki-api.ts            # 知识库 API (空间列表/节点 CRUD/findOrCreate)
│   ├── doc-api.ts             # 文档 Block API (读取/删除/写入/覆盖)
│   ├── drive-api.ts           # 云盘上传 API (multipart 图片上传)
│   ├── rate-limiter.ts        # API 频率控制 (令牌桶算法)
│   └── types.ts               # 飞书 API 类型定义 + 代码语言枚举
├── converter/
│   ├── markdown-to-blocks.ts  # Markdown → 飞书 Block 转换 (含 Obsidian 语法适配)
│   └── image-resolver.ts      # 图片路径解析 + 上传 (本地/网络)
├── sync/
│   ├── sync-engine.ts         # 同步核心 (单篇/批量, 目录结构映射)
│   └── sync-state.ts          # frontmatter 同步状态管理 (原子读写)
└── ui/
    ├── sync-sidebar-view.ts   # 侧边栏面板 (文件夹树/checkbox/过滤/搜索)
    ├── wiki-browser-modal.ts  # 知识空间节点浏览器弹窗
    └── sync-progress-modal.ts # 批量同步进度弹窗
```

### 核心设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 认证方式 | `tenant_access_token` | 不需要浏览器 OAuth 流程，不依赖第三方中继服务 |
| 文档写入 | 直接 Block API | 竞品 FeishuShare 用 import-then-patch 会丢失嵌套内容 |
| Markdown 解析 | 手写解析器 | 避免外部 npm 依赖，插件体积 < 50KB |
| 图片处理 | 先上传 Drive 获取 token | 飞书要求 image block 引用 file_token |
| 状态管理 | frontmatter | 使用 Obsidian 原子 API `processFrontMatter` 避免竞争条件 |
| 目录映射 | findOrCreateNode | 根据文件路径自动创建对应的知识库节点层级 |

### 飞书 API 频率限制

| 操作 | 限制 | 插件设置 |
|------|------|----------|
| 知识库节点创建 | 100 次/分钟 | 最小间隔 700ms |
| 文档块写入 | 100 次/分钟 | 最小间隔 700ms |
| 媒体上传 | 5 次/秒 | 最小间隔 250ms |

## 开发

```bash
# 安装依赖
npm install

# 开发模式（watch）
npm run dev

# 生产构建
npm run build

# 类型检查
npx tsc --noEmit --skipLibCheck
```

构建产物 `main.js` 会输出到项目根目录。将 `main.js`、`manifest.json`、`styles.css` 复制到 `.obsidian/plugins/obsidian-feishu-wiki-sync/` 即可测试。

## 与竞品的对比

| 特性 | 本插件 | FeishuShare | ObShare | ob2feishu |
|------|--------|-------------|---------|-----------|
| 目录结构保留 | 自动映射 | 不支持 | 不支持 | 手动 |
| 第三方中继 | 无 | 依赖 md2feishu.xinqi.life | 无 | 无 |
| 更新不丢数据 | Block API 直接构建 | import-then-patch 会丢失 | N/A | N/A |
| 连接测试 | 一键测试 | 无 | 无 | 无 |
| 侧边栏面板 | 文件夹树 + checkbox | 无 | 无 | 无 |
| Obsidian 语法 | wikilink/callout/embed | 部分 | 部分 | 部分 |
| 类型 | Obsidian 插件 | Obsidian 插件 | Obsidian 插件 | Python CLI |

## License

MIT
