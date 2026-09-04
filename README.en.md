# @supanexus/dsh-plugin-chat-enhance

[中文](./README.md) · English

SupaNexus **chat enhance** for DeepSeek Harness: searchable model picker, image capability tags, and composer image upload.

## Install

```bash
dsh plugin --profile web add github:supanexus/dsh-plugin-chat-enhance#v0.3.0
```

Restart `dsh web` (or Desktop Host) after install. Open the printed `?token=` URL.

## Features

- Recent-model chips (persisted in `localStorage`)
- Searchable picker with provider tabs and an “Images only” filter
- **Image** tag next to vision-capable model names
- Paperclip on `conversation.input.left` (official draft attachment path)
- Shadows `conversation.input.model` at `priority: -1`

## Soft dependency

Model picking works without `@supanexus/dsh-plugin-supanexus-core`. Vision tags and image upload need the model’s `input` modalities to include `image` (typically written by SupaNexus Core Quick Setup / OAuth). Without Core, those features simply stay inactive.

## Config

```yaml
config:
  maxRecent: 4
```

## Develop / rebuild

Peer `@deepseek-ai/*` packages are not on the public npm registry. Build inside a DeepSeek Harness / `whale-harness-free` engine checkout:

```bash
pnpm install && pnpm build && pnpm test
dsh plugin --profile web add "file:/absolute/path/to/dsh-plugin-chat-enhance"
```

Published installs use the committed `lib/` artifacts (no user-side build).

## License

MIT © SupaNexus
