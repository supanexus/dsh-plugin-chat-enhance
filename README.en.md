# @supanexus/dsh-plugin-chat-enhance

[中文](./README.md) · English

Searchable model picker, vision capability tags, and composer image upload for DeepSeek Harness.

Repo: [GitHub](https://github.com/supanexus/dsh-plugin-chat-enhance)

## Install

```bash
dsh plugin --profile web add github:supanexus/dsh-plugin-chat-enhance#v0.3.0
```

Fully restart `dsh web` (or Desktop Host) after install, then open the printed `?token=` URL.

## What it does

- **Recent models** — quick chips for models you used lately
- **Searchable picker** — filter by provider; optional “Images only”
- **Image tag** — marks models that accept image input
- **Upload** — paperclip on the composer to attach images to the draft

## How to use

1. Open any conversation
2. Open the model control → search or filter; turn on “Images only” when you need vision
3. Click the paperclip to attach images, then send

## Notes

- Model search/switch works **without** SupaNexus Core
- Vision tags and upload need the selected model to declare image input (often via Core Quick Setup / OAuth). Otherwise those features stay inactive.

## Optional config

```yaml
config:
  maxRecent: 4   # number of recent-model chips
```

## License

MIT © SupaNexus
