# Obsidian Feishu Wiki Sync

Sync Obsidian Markdown notes to a Feishu Wiki knowledge base while preserving the folder structure.

> Current builds are verified against Feishu China (`open.feishu.cn`). Lark international endpoints are not verified yet.

## Features

- Visual settings tab for Feishu App ID / App Secret.
- One-click connection test.
- Wiki space and node browser.
- Folder-tree sidebar with selective and batch sync.
- Markdown to Feishu Docx block conversion.
- Local and remote image upload support.
- Sync metadata stored in note frontmatter.

## Installation

The complete installation guide is maintained in Chinese:

- [README.md](./README.md)
- [docs/TUTORIAL.md](./docs/TUTORIAL.md)

Recommended path: build from source. A GitHub Release is optional, not required.

```bash
git clone https://github.com/summerchaserwwz/obsidian-feishu-wiki-sync.git
cd obsidian-feishu-wiki-sync
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, and `styles.css` into your Obsidian vault:

```text
.obsidian/plugins/obsidian-feishu-wiki-sync/
```

Do not copy the source folder, `node_modules`, or `data.json` into the plugin directory. The plugin directory should directly contain those three files.

Restart Obsidian, enable the plugin from `Settings -> Community plugins`, configure your Feishu App ID and App Secret, test connection, and choose a target wiki space.

## Feishu Permissions

Create a Feishu self-built app and enable:

- `wiki:wiki`
- `docx:document`
- `drive:drive`

You must also add the app, or a group containing the app bot, to the target wiki space. A successful App ID / App Secret test only proves the app identity is valid; it does not prove that the target wiki space is accessible.

## Privacy

- App Secret and cached access token are stored locally in Obsidian plugin `data.json`.
- Do not publish `.obsidian/plugins/obsidian-feishu-wiki-sync/data.json`.
- Synced notes receive `feishu_*` frontmatter fields containing Feishu space, node, and document identifiers.
- Remove or redact those fields before publishing a vault, screenshots, or logs publicly.

## License

MIT
