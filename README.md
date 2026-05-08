# SpecForge CLI

AI-native spec-driven development workflow tool.

## Installation

```bash
pnpm install
```

## Commands

| Command | Description |
|---------|-------------|
| `specforge init [path]` | Initialize SpecForge in your project |
| `specforge add-skill <name>` | Create a new skill |
| `specforge add-command --type <type> --name <name>` | Create a new command |
| `specforge list` | List commands and skills |
| `specforge status` | Query phase and artifact DAG status |
| `specforge profile <show|set>` | View or switch lifecycle profiles |
| `specforge run-hook --phase <name> --stage <before\|after>` | Run extension hooks |
| `specforge update [path]` | Update SpecForge framework assets |
| `specforge doctor` | Run diagnostics on the project structure |

## Lifecycle

SpecForge uses an 8-phase lifecycle:

```text
foundation → requirements → design → planning → implementation → quality → release → evolution
```

The former `operations` phase has been removed. Runbook, monitoring, alerting, rollback, and operational handoff now belong to `release`.

## Profiles

Profiles control which workflow commands are scaffolded and displayed:

- `minimal` — foundation, requirements, implementation, quality, release
- `standard` — all 8 phases (default)
- `custom` — explicit `profile.enabledPhases` in `specforge/config.yaml`

```bash
specforge init ./my-project --profile=standard
specforge profile show
specforge profile set custom --enabled-phases=foundation,requirements,implementation,quality,release
```

## Language Adapters

SpecForge is language-agnostic. Workflow templates describe abstract actions like test, lint, build, and version sync; concrete commands live in:

```text
.specforge/skills/workflow-steps/language-adapters/SKILL.md
```

Examples:

```bash
# Python
pytest
ruff check .
python -m build

# Spring Boot / Java
mvn test
mvn spotless:check
mvn package
```

## Development

```bash
# Run CLI in dev mode
pnpm dev -- --help

# Build
pnpm build

# Test
pnpm test

# Lint & format
pnpm lint
pnpm format
```

## Project Structure

- `.specforge/` — Framework assets (commands, skills, context)
- `specforge/` — User assets (specs, changes, archive)
