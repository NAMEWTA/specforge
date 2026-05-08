# grill-me

面向任何支持 [open agent skills](https://github.com/vercel-labs/skills) 格式的 AI 编程助手的高强度访谈技能——Claude Code、Cursor、Codex、OpenCode、Continue、Windsurf，以及 40 多种其他工具。

`/grill-me` 不负责找 bug。它通过暴露意图、约束、隐藏假设和未说出口的备选方案，帮助你更清楚地理解自己真正想要什么——适用于编码、市场营销、个人品牌、SOP、系统思维、流程设计，以及艰难的商业决策。

## 安装

```bash
# 项目本地安装（默认）——随项目一并提交
npx skills@latest add satya-janghu/agent-skills/skills/grill-me

# 全局安装——可在所有项目中使用
npx skills@latest add satya-janghu/agent-skills/skills/grill-me -g

# 非交互式，仅 Claude Code，全局安装
npx skills@latest add satya-janghu/agent-skills/skills/grill-me -g -a claude-code -y
```

`skills` CLI 会提示你选择要安装到哪个 AI 代理（Claude Code、Cursor、Codex 等），以及是项目本地安装还是用户全局安装。

如果你不想使用 CLI，请参阅下面的 [手动安装](#手动安装)。

## 用法

在任何支持 skills 的 AI 代理中：

```
/grill-me <你想深入盘问的主题>
```

也可以通过这些短语触发："grill me on…"、"interview me about…"、"pressure-test this…"、"help me think through…"。

当下一步具体行动已经变得可行时，这个技能就结束了（例如写代码、起草简报、修改 SOP、提交 commit）。在那之前，它会把精炼后的会话日志写入 `<cwd>/.grill/<slug>.md`。

## 它的不同之处

大多数 AI 助手问得太少，而且太早宣称“我已经可以开始了”。`grill-me` 就是为对抗这种倾向而设计的：

- **一次只问一个问题，并附上推荐答案**——让你有东西可以回应，而不是面对空白输入框。
- **先把上一条回答问透，再横向展开**——深度来自沿着一条线追到底，而不是铺得更宽。
- **从一组不同的视角中取材，但不直接把这些视角说出来**——第一性原理、预先验尸、钢人化、可逆性、五个为什么、受众、隐藏假设挖掘、第二选择、可持续性，以及成熟的思维框架（Naval 的无许可杠杆、Thiel 的“你相信什么是别人不同意的”、Hormozi 的价值公式、Christensen 的 JTBD、Munger 的逆向思考、Bezos 的后悔最小化）。对话会显得自然；结构被隐藏在后面。
- **对含糊回答、闪躲和自相矛盾保持追问**，而不是把雾气当成答案。
- **默认会把半截答案改写成一个可被反驳的草案**——比起凭空想答案，反驳草案更容易。
- **会根据领域调整提问视角**（编码、市场营销、SOP、商业决策），但不会去排查 bug。目标是扩大用户对自己真正想要什么的理解，而不是挑执行层面的毛病。
- **会把会话日志写入 `<cwd>/.grill/<slug>.md`**——包含意图、约束、关键决策、浮现出的假设、开放问题、非目标。日志是提炼后的结果，不是逐字记录。

完整说明请参阅 [SKILL.md](SKILL.md)。

## 手动安装

如果你不想使用 `skills` CLI，可以把 `SKILL.md` 直接放到对应代理需要的位置：

| 代理 | 位置 |
|---|---|
| Claude Code（全局） | `~/.claude/skills/grill-me/SKILL.md` |
| Claude Code（项目） | `<project>/.claude/skills/grill-me/SKILL.md` |
| Cursor | `<project>/.cursor/skills/grill-me/SKILL.md` |
| Codex | `<project>/.codex/skills/grill-me/SKILL.md` |

使用 `curl` 的一行命令：

```bash
mkdir -p ~/.claude/skills/grill-me && \
  curl -fsSL https://raw.githubusercontent.com/satya-janghu/agent-skills/main/skills/grill-me/SKILL.md \
  -o ~/.claude/skills/grill-me/SKILL.md
```

## 许可证

MIT——参见 [LICENSE](../../LICENSE)。