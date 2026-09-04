# @supanexus/dsh-plugin-chat-enhance

中文 · [English](./README.en.md)

可搜索的模型选择器、多模态「图片」能力标签，以及对话输入栏图片上传。

仓库：[GitHub](https://github.com/supanexus/dsh-plugin-chat-enhance)

## 安装

```bash
dsh plugin --profile web add github:supanexus/dsh-plugin-chat-enhance#v0.3.0
```

安装后请**完全重启** `dsh web`（或 Desktop Host），并用打印的 `?token=` 地址打开。

## 能做什么

- **最近模型**：输入栏旁显示最近用过的模型，一点即切
- **搜索选模型**：按名称搜索，可按提供方筛选，可只看支持图片的模型
- **图片标签**：支持图片输入的模型名称旁显示「图片」
- **上传图片**：输入栏左侧回形针，把图片加入当前草稿并发送

## 怎么用

1. 打开任意对话
2. 点模型选择区域 → 搜索或筛选想要的模型；需要识图时打开「仅图片」
3. 需要发图时点左侧回形针选择图片，再发送

## 说明

- **不依赖** SupaNexus Core 也能搜索、切换模型
- 「图片」标签与上传，需要当前模型已声明支持图片输入（例如通过 Core 快速配置 / OAuth 写入）；否则这两项会保持不可用，不影响其它功能

## 可选配置

```yaml
config:
  maxRecent: 4   # 最近模型芯片数量
```

也可在设置 → 插件中调整（若界面提供该项）。

## License

MIT © SupaNexus
