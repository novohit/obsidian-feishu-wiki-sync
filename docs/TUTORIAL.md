# Obsidian 笔记同步到飞书知识库完整教程

本文是一份从零跑通 Obsidian Feishu Wiki Sync 的教程，适合 Windows、macOS 和使用 AI 辅助安装的用户。

## 最终效果

你在 Obsidian 中维护 Markdown 笔记和文件夹结构，插件会把选中的笔记同步到指定飞书知识库，并尽量保留目录层级。

推荐流程：

```text
安装 Obsidian 插件
  -> 创建飞书自建应用
  -> 开通 wiki/docx/drive 权限
  -> 发布应用版本
  -> 将应用或应用所在群加入目标知识库
  -> Obsidian 填 App ID / App Secret
  -> 测试连接
  -> 浏览并选择知识空间
  -> 先同步单篇测试笔记
  -> 再批量同步目录
```

## 1. 安装插件

默认推荐从源码构建安装。Release 不是必需条件。

先按 README 中的 Windows/macOS 源码安装步骤执行。核心动作是：

1. `git clone` 仓库到临时目录。
2. `npm install`
3. `npm run build`
4. 把生成的三个文件放进你的 Obsidian vault：

```text
.obsidian/plugins/obsidian-feishu-wiki-sync/
```

安装成功后，插件目录应直接包含：

```text
main.js
manifest.json
styles.css
```

## 2. 创建飞书自建应用

1. 打开飞书开放平台：<https://open.feishu.cn>
2. 创建企业自建应用。
3. 获取应用的 `App ID` 和 `App Secret`。
4. 在权限管理中开通：

| 权限 | 用途 |
|---|---|
| `wiki:wiki` | 读取知识空间、创建知识库节点 |
| `docx:document` | 读取和写入飞书文档内容 |
| `drive:drive` | 上传图片到飞书云盘 |

5. 发布应用版本，让权限生效。

注意：`App ID` 和 `App Secret` 测试通过，只说明应用身份正确，不代表它已经能访问目标知识库。

## 3. 将应用加入目标知识库

这是最容易卡住的一步。

插件调用的是飞书 Wiki API。目标知识库必须给这个应用空间级访问权限，否则 Obsidian 中只能看到已授权的其他知识库，或者完全看不到目标知识库。

推荐做法：

1. 创建一个飞书群。
2. 将自建应用机器人加入这个群。
3. 打开目标飞书知识库设置。
4. 在成员或管理员设置中添加这个群。
5. 给群设置可编辑或管理员权限。

也可以在知识库中使用“添加文档应用”入口，直接添加对应自建应用。不同飞书租户的 UI 可能略有差异，以知识库设置中的权限入口为准。

## 4. 在 Obsidian 中配置插件

打开：

```text
设置 -> 第三方插件 -> 飞书知识库同步
```

填写：

```text
App ID
App Secret
```

然后点击：

1. `测试连接`
2. `浏览并选择`
3. 选择目标知识空间和目标节点

判断标准：

| 状态 | 含义 |
|---|---|
| 测试连接成功 | App ID / App Secret 正确 |
| 能看到目标知识库 | 应用已经获得知识库权限 |
| 能选中目标节点 | Wiki 节点读取权限正常 |
| 能同步测试笔记 | 文档写入和节点创建权限正常 |

## 5. 首次同步

首次不要全选整个 vault。建议新建一篇测试笔记：

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

## 6. 同步元数据

同步成功后，插件会在笔记 frontmatter 中写入：

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

如果你要公开发布 vault 或截图，请先脱敏这些字段。

## 7. 常见问题

| 现象 | 大概率原因 | 处理方式 |
|---|---|---|
| Obsidian 看不到插件 | 插件目录层级不对，或安全模式未关闭 | 确认插件目录下直接有 `main.js`、`manifest.json`、`styles.css` |
| 测试连接失败 | App ID / App Secret 错误，或应用未发布 | 回飞书开放平台检查凭据和应用版本 |
| 测试连接成功，但看不到目标知识库 | 应用没有目标知识库空间权限 | 将应用或应用所在群加入知识库成员/管理员 |
| 只能看到某一个知识库 | 当前应用只被授权到那个知识库 | 给新的目标知识库单独授权 |
| 同步失败提示 403 | API 权限或知识库权限不足 | 检查 `wiki:wiki`、`docx:document`、`drive:drive` 和知识库成员权限 |
| 图片不显示 | 图片路径找不到，或云盘上传权限不足 | 先用无图片笔记测试，再检查 `drive:drive` 和图片路径 |
| 重复创建文档 | `feishu_*` 映射被删除，或切换了目标节点 | 保留同步元数据，固定目标节点后再批量同步 |
| 飞书端内容被覆盖 | 当前流程以 Obsidian 为源头 | 不要在飞书端长期手动编辑同一篇同步文档 |

## 8. 隐私与安全

- `App Secret` 和缓存 token 会保存在本地插件数据文件 `data.json` 中。
- 不要公开 `.obsidian/plugins/obsidian-feishu-wiki-sync/data.json`。
- 同步后的笔记 frontmatter 包含飞书空间、节点和文档标识。
- 公开发布 vault、教程截图或报错日志前，请先检查是否包含 App Secret、token、飞书 URL、用户头像、空间 ID、文档 token。

## 9. 推荐给 AI 的安装提示词

```text
请根据 README 帮我安装 Obsidian Feishu Wiki Sync。
我的系统是 Windows/macOS。
我的 Obsidian vault 路径是：<填写你的 vault 路径>。
请从源码 git clone、npm install、npm run build，
然后把生成的 main.js、manifest.json、styles.css 复制到 vault 的
.obsidian/plugins/obsidian-feishu-wiki-sync/ 目录。
安装前先确认 Node.js、npm、Git 可用。
安装后告诉我如何在 Obsidian 中启用插件。
```
