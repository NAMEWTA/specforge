#!/usr/bin/env python3
"""
Quick validation for SpecForge command templates.

校验点：
- 目录结构：<cmd>/<cmd>.md 必须存在
- frontmatter：必须是 YAML 字典，且包含 name/type/description/version/author
- name：kebab-case 且与目录名一致
- type：workflow-command 或 tool-command
"""

import re
import sys
from pathlib import Path
from typing import Optional

try:
    import yaml
except ModuleNotFoundError:
    yaml = None


ALLOWED_TYPES = {"workflow-command", "tool-command"}
RE_NAME = re.compile(r"^[a-z][a-z0-9-]*$")


def _extract_frontmatter(content: str) -> Optional[str]:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            return "\n".join(lines[1:i])
    return None


def _parse_simple(frontmatter_text: str) -> Optional[dict[str, str]]:
    parsed: dict[str, str] = {}
    for raw_line in frontmatter_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            return None
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            return None
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        parsed[key] = value
    return parsed


def validate_command(command_dir: Path) -> tuple[bool, str]:
    if not command_dir.exists():
        return False, f"Command directory not found: {command_dir}"
    if not command_dir.is_dir():
        return False, f"Not a directory: {command_dir}"

    cmd_name = command_dir.name
    md_path = command_dir / f"{cmd_name}.md"
    if not md_path.exists():
        return False, f"Missing required file: {md_path.name}"

    content = md_path.read_text(encoding="utf-8")
    fm_text = _extract_frontmatter(content)
    if fm_text is None:
        return False, "Invalid frontmatter: missing --- delimiters"

    if yaml is not None:
        try:
            fm = yaml.safe_load(fm_text)
        except Exception as e:
            return False, f"Invalid YAML frontmatter: {e}"
        if not isinstance(fm, dict):
            return False, "Frontmatter must be a YAML dictionary"
    else:
        fm = _parse_simple(fm_text)
        if fm is None:
            return False, "Invalid YAML frontmatter (PyYAML not installed; only simple key:value supported)"

    required = ["name", "type", "description", "version", "author"]
    missing = [k for k in required if k not in fm]
    if missing:
        return False, f"Missing required frontmatter key(s): {', '.join(missing)}"

    name = str(fm.get("name", "")).strip()
    if name != cmd_name:
        return False, f"Frontmatter name '{name}' must match directory name '{cmd_name}'"
    if not RE_NAME.match(name):
        return False, f"Invalid command name '{name}' (must be kebab-case, start with a letter)"

    cmd_type = str(fm.get("type", "")).strip()
    if cmd_type not in ALLOWED_TYPES:
        return False, f"Invalid type '{cmd_type}'. Allowed: {', '.join(sorted(ALLOWED_TYPES))}"

    desc = str(fm.get("description", "")).strip()
    if not desc:
        return False, "Description must be non-empty"

    return True, "Command template is valid!"


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: quick_validate_command.py <path/to/command-directory>")
        sys.exit(1)

    ok, msg = validate_command(Path(sys.argv[1]).expanduser().resolve())
    print(msg)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

