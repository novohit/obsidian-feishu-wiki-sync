# Obsidian Feishu Wiki Sync

Sync Obsidian notes to Feishu/Lark Knowledge Base. Preserves folder structure, supports visual configuration, connection testing, and selective sync.

## Features

- **Visual Configuration** -- Settings tab with App ID/Secret input, one-click connection test
- **Wiki Space Browser** -- Tree-based node selector for choosing sync targets
- **Directory Structure Mapping** -- Vault folder hierarchy auto-mapped to Feishu wiki node tree
- **Selective Sync** -- Sidebar with folder tree, checkboxes, filters, and search
- **Batch Sync** -- Select multiple files/folders and sync with progress modal
- **Incremental Updates** -- Frontmatter tracks sync state, only pushes changed files
- **No Third-Party Relay** -- Uses `tenant_access_token` directly, no OAuth middleware

## Quick Start

1. Create a Feishu self-built app at [open.feishu.cn](https://open.feishu.cn)
2. Enable permissions: `wiki:wiki`, `docx:document`, `drive:drive`
3. Add the app to your wiki space (via group membership)
4. Install this plugin in Obsidian
5. Configure App ID/Secret in plugin settings
6. Click "Test Connection" -- done

See [README.md](./README.md) for detailed setup instructions (Chinese).

## License

MIT
