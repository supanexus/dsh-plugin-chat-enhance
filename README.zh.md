# @supanexus/dsh-plugin-chat-enhance

SupaNexus **模型对话增强**：可搜索模型选择器、多模态「图片」标签、输入栏图片上传。

## 安装

```bash
dsh plugin --profile web add github:supanexus/dsh-plugin-chat-enhance#v0.3.0
```

安装后请**完全重启** `dsh web`（或 Desktop Host），并用打印的 `?token=` 地址打开。

## 功能

- 最近模型快捷芯片（`localStorage`）
- 搜索弹窗：按提供方筛选、「仅图片」过滤
- 支持图片输入的模型显示「图片」标签
- 输入栏左侧回形针上传（官方草稿附件通道）
- 替换 `conversation.input.model`（`priority: -1`）

## 软依赖

没有 `@supanexus/dsh-plugin-supanexus-core` 时，模型搜索选择仍可用。图片标签与上传依赖模型已声明 `image` 输入模态（通常由 SupaNexus Core 快速配置 / OAuth 写入）。未安装 Core 时这些能力保持不启用，不会报错。

## 配置

```yaml
config:
  maxRecent: 4
```

## 开发 / 重构建

公开 npm 上没有 `@deepseek-ai/*`。需在 DeepSeek Harness / `whale-harness-free` 的 engine 工作区内构建：

```bash
pnpm install && pnpm build && pnpm test
dsh plugin --profile web add "file:/绝对路径/dsh-plugin-chat-enhance"
```

GitHub 安装使用仓内已提交的 `lib/`，用户侧无需编译。

## License

MIT © SupaNexus
