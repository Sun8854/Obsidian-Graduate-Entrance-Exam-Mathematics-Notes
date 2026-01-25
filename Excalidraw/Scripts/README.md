# Paste Text With LaTeX (Excalidraw Script)

将含有 $...$ / $$...$$ 的文本一键转换为 Excalidraw 中可渲染的 LaTeX 公式元素，同时保留普通文本。

## 功能
- 选中已有文本元素后运行脚本
- 自动识别行内公式与独立公式
- 同一行内文本/公式中心线对齐
- 可选：成功后删除原文本

## 依赖
- Obsidian
- Excalidraw 插件（含 ExcalidrawAutomate 脚本引擎）

## 安装
1. 将脚本文件放入你的脚本目录：
   - 默认目录示例：Excalidraw/Scripts
2. 在 Excalidraw 插件设置中刷新脚本列表。

脚本文件：Paste Text With LaTeX.md

## 使用
1. 在画布中选中一个或多个文本元素（可多行/多元素）。
2. 运行脚本 Paste Text With LaTeX。
3. 脚本会在原文本中心位置生成渲染结果。

## 设置
运行一次脚本后，在脚本设置中可见：
- 成功后删除原文本：默认关闭。开启后会在生成成功时删除被选中的原文本元素。

## 注意事项
- 若公式渲染失败，会回退为普通文本，并提示“部分公式未能渲染”。
- 若需要批量处理，建议先复制一份文本以防误删。

## 常见问题
- Q: 结果没有显示？
  A: 请确认 Excalidraw 工具栏的“Insert LaTeX”功能可正常使用；若可用，请重新运行脚本或检查选择的是否为文本元素。

## 许可
MIT
