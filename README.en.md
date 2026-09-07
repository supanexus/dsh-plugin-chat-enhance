# @supanexus/dsh-plugin-chat-enhance

[中文](./README.md) · English

Searchable model picker and vision capability tags for DeepSeek Harness. Attachment upload uses the official InputBar paperclip.

Repo: [GitHub](https://github.com/supanexus/dsh-plugin-chat-enhance)

## Install

```bash
dsh plugin --profile web add github:supanexus/dsh-plugin-chat-enhance#v0.3.4
```

Fully restart `dsh web` (or Desktop Host) after install, then open the printed `?token=` URL.

## What it does

- **Recent models** — quick chips for models you used lately
- **Searchable picker** — filter by provider; optional “Images only”
- **Image tag** — marks models that accept image input

## How to use

1. Open any conversation
2. Open the model control → search or filter; turn on “Images only” when you need vision
3. Use the official composer paperclip to attach files, then send

## Notes

- Model search/switch works **without** SupaNexus Core
- Vision tags need the selected model to declare image input (often via Core Quick Setup / OAuth). Otherwise those filters stay inactive.
- Attachment upload is provided by dsh ≥ 0.1.3 official InputBar (images + generic files). Non-vision models still accept generic files; only image intake is refused. Unknown capability fails open (official submit-time checks still apply).

## Optional config

```yaml
config:
  maxRecent: 4   # number of recent-model chips
```

## License

MIT © SupaNexus
