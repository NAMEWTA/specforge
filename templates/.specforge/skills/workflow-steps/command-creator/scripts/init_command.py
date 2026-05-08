#!/usr/bin/env python3
"""
Command Initializer - 为 SpecForge 创建新的 command 模板目录

用法：
  init_command.py <command-name> --path <输出目录> --type <workflow-command|tool-command>
      [--resources scripts,references,assets] [--examples]

示例：
  init_command.py requirements-clarify --path templates/.specforge/commands/workflow --type workflow-command --resources references
  init_command.py review --path templates/.specforge/commands/tools --type tool-command --resources references,scripts
"""

import argparse
import re
import sys
from pathlib import Path

MAX_NAME_LENGTH = 64
ALLOWED_TYPES = {"workflow-command", "tool-command"}
ALLOWED_RESOURCES = {"scripts", "references", "assets"}


COMMAND_TEMPLATE = """---
name: {command_name}
type: {command_type}
description: >-
  [TODO] 用一句话说明该命令做什么，并列出触发场景/关键词（用于发现）。
version: "1.0.0"
author: "wta"
---

<!-- preamble:bash
# 技能注入（按命令特性调整触发词）
specforge list --skills --triggers={default_triggers} --format=json

# 前置产物检测（如适用）
# specforge status --phase={default_phase} --check-requires

# 环境检测
specforge doctor --check-deps --quiet
-->

# {command_title}

## Iron Law

> [TODO] 写出 HARD-GATE：什么情况下必须阻断。

---

## Step 1: 加载上下文

- [ ] 读取 `.specforge/config.yaml`（框架机器源）
- [ ] 读取 `specforge/config.yaml`（项目机器源）

---

## Step 2: 输入与前置条件

- [ ] [TODO] 列出必要输入与前置产物

---

## Step 3: 执行步骤

- [ ] [TODO] 用可执行步骤描述（避免 TODO/占位符）

---

## Step 4: 产物清单

- [ ] [TODO] 本命令必须生成/更新哪些文件（路径 + 最小结构）

---

## Step 5: 完成衔接（handoff）

**下一步**：按 `.specforge/config.yaml` 的 `handoffs.{command_name}` 推荐进入下一阶段。

---

## 常见阻断与纠偏（errors 引用）

- [ ] E001_missingPrerequisiteArtifact：缺少前置产物
- [ ] E004_noVerificationEvidence：缺少验证证据（如适用）
"""


def _normalize_name(name: str) -> str:
    normalized = name.strip().lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    normalized = normalized.strip("-")
    normalized = re.sub(r"-{2,}", "-", normalized)
    return normalized


def _title_case(name: str) -> str:
    return " ".join(part.capitalize() for part in name.split("-"))


def _parse_resources(raw: str) -> list[str]:
    if not raw:
        return []
    items = [x.strip() for x in raw.split(",") if x.strip()]
    invalid = sorted({x for x in items if x not in ALLOWED_RESOURCES})
    if invalid:
        print(f"[ERROR] Unknown resource type(s): {', '.join(invalid)}")
        print(f"   Allowed: {', '.join(sorted(ALLOWED_RESOURCES))}")
        sys.exit(1)
    # 去重保持顺序
    seen = set()
    out: list[str] = []
    for x in items:
        if x not in seen:
            out.append(x)
            seen.add(x)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize a SpecForge command template directory.")
    parser.add_argument("command_name", help="command 名称（kebab-case）")
    parser.add_argument("--path", required=True, help="输出父目录（命令目录的上级）")
    parser.add_argument("--type", required=True, dest="command_type", help="workflow-command 或 tool-command")
    parser.add_argument("--resources", default="", help="可选资源目录：scripts,references,assets")
    parser.add_argument("--examples", action="store_true", help="生成示例占位文件")
    args = parser.parse_args()

    command_name = _normalize_name(args.command_name)
    if not command_name:
        print("[ERROR] Empty command name after normalization.")
        sys.exit(1)
    if len(command_name) > MAX_NAME_LENGTH:
        print(f"[ERROR] Command name too long ({len(command_name)}). Max {MAX_NAME_LENGTH}.")
        sys.exit(1)
    if not re.match(r"^[a-z][a-z0-9-]*$", command_name):
        print(f"[ERROR] Invalid command name: {command_name}")
        print("   Must be kebab-case and start with a letter.")
        sys.exit(1)

    command_type = args.command_type.strip()
    if command_type not in ALLOWED_TYPES:
        print(f"[ERROR] Invalid type: {command_type}")
        print(f"   Allowed: {', '.join(sorted(ALLOWED_TYPES))}")
        sys.exit(1)

    resources = _parse_resources(args.resources)

    out_parent = Path(args.path).expanduser().resolve()
    out_dir = out_parent / command_name
    out_dir.mkdir(parents=True, exist_ok=False)

    md_path = out_dir / f"{command_name}.md"
    default_triggers = "workflow" if command_type == "workflow-command" else "tool"
    default_phase = "requirements" if command_type == "workflow-command" else ""
    content = COMMAND_TEMPLATE.format(
        command_name=command_name,
        command_type=command_type,
        command_title=_title_case(command_name),
        default_triggers=default_triggers,
        default_phase=default_phase,
    )
    md_path.write_text(content, encoding="utf-8")

    for r in resources:
        (out_dir / r).mkdir(parents=True, exist_ok=True)

    if args.examples:
        if "references" in resources:
            (out_dir / "references" / "README.md").write_text(
                "# references\n\n把长清单/案例库放这里，SKILL.md 或 command 正文用链接引用。\n",
                encoding="utf-8",
            )
        if "scripts" in resources:
            (out_dir / "scripts" / "example.sh").write_text(
                "#!/usr/bin/env bash\nset -euo pipefail\n\necho \"example script\"\n",
                encoding="utf-8",
            )

    print(f"[OK] Created command template at: {out_dir}")


if __name__ == "__main__":
    main()

