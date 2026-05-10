# SpecForge

> **AI-native spec-driven development workflow CLI** — a synthesis of lessons from [OpenSpec](https://github.com/Fission-AI/OpenSpec), [gstack](https://github.com/garrytan/gstack), [superpowers](https://github.com/obra/superpowers), [claude-task-master](https://github.com/eyaltoledano/claude-task-master) and [Anthropic skills](https://github.com/anthropics/skills), re-forged into a single local CLI plus a repeatable workflow template.

[![npm](https://img.shields.io/npm/v/@namewta/specforge.svg)](https://www.npmjs.com/package/@namewta/specforge)
[![node](https://img.shields.io/node/v/@namewta/specforge.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Languages:** **English** · [简体中文](./README-ZH.md)

---

## Heritage: Built on the Shoulders of Five Projects

SpecForge does not reinvent spec-driven development — it **internalizes and fuses** the most battle-tested patterns from the open-source ecosystem into one coherent toolchain:

| Source Project | What SpecForge Adopts |
|---|---|
| [**OpenSpec** (Fission-AI)](https://github.com/Fission-AI/OpenSpec) | Dual-directory model (`.specforge/` framework assets + `specforge/` user assets), artifact DAG (`BLOCKED / READY / DONE`), Profile system (`minimal` / `standard` / `custom`), dual-track surface of Commands + Skills |
| [**gstack** (garrytan)](https://github.com/garrytan/gstack) | Preamble bootstrapping system (inline `<!-- preamble:bash -->` blocks), multi-perspective plan review, session-aware context collection |
| [**superpowers** (obra)](https://github.com/obra/superpowers) | Iron Laws hard gates, skill chaining / invocation, sub-agent-driven implementation, anti-evasion language, stress-test discipline |
| [**claude-task-master** (eyaltoledano)](https://github.com/eyaltoledano/claude-task-master) | PRD → task decomposition pipeline, Zod-validated schemas, complexity analysis, structured response contracts |
| [**Anthropic skills**](https://github.com/anthropics/skills) | Progressive disclosure (L1 frontmatter → L2 body → L3 `references/`), skill-creator methodology, benchmark-driven authoring |

Also drawing on [spec-kit](https://github.com/github/spec-kit) for the constitution / extension-hooks pattern and on [grill-me](https://github.com/obra/grill-me) for multi-perspective interrogation.

SpecForge's job is to keep the good parts — artifact gating, progressive loading, profile tailoring, sub-agent hand-offs — and unify them behind one CLI so you get the benefits without adopting five separate tools.

## What It Solves

Working with AI on real codebases, the friction is almost never "the model can't write it." It's:

- **Blurred phase boundaries** — requirements, design, implementation, QA and release collapse into one chat; agents skip steps
- **Context bloat** — every rule, style guide and SOP gets injected at once; hit rate drops, cost explodes
- **No compounding memory** — each project re-dictates the same team conventions from zero
- **Fragmented tooling** — Claude, Cursor, Kiro, Codex all want prompts in different shapes

SpecForge pins all of this to the filesystem. It generates `.specforge/` (framework assets) and `specforge/` (user assets) in your repo, encodes the 8-phase lifecycle, commands, skills, artifact dependencies and extension hooks as plain files, then lets AI agents advance through the workflow — while humans stay auditable, editable and reversible at every step.

## Core Design

### Dual-Directory Model (from OpenSpec)

```
.specforge/          # framework assets — regeneratable by `specforge update`
  ├── commands/      #   workflow + tool commands
  ├── skills/        #   7 skill categories
  ├── templates/     #   artifact templates (PROPOSAL.md / DESIGN.md / TASKS.md …)
  ├── config.yaml    #   framework-level machine source (context / rules / errors / handoffs)
  └── extensions.yaml #  hook declarations

specforge/           # user assets — source of truth, never auto-overwritten
  ├── project.md     #   project metadata
  ├── config.yaml    #   project-level overrides / additions
  ├── spec/          #   current specifications
  ├── brainstorming/ #   brainstorm artifacts
  ├── context/       #   glossary / ADRs / lessons
  ├── changes/       #   active changes
  └── archive/       #   completed changes
```

### 8-Phase Lifecycle

```
foundation → requirements → design → planning → implementation → quality → release → evolution
```

- Each phase owns a `workflow-command` and a **canonical artifact**
- Phases are connected by an **artifact DAG**; missing prerequisites are blocked by a hard gate (`specforge status --check-requires`)
- Operations semantics (runbook / monitoring / rollback) are folded into `release` rather than a separate stage

### Progressive Disclosure (from Anthropic skills)

| Level | Loaded When | Content | Budget |
|-------|-------------|---------|--------|
| L1 Always | Always | frontmatter (name / type / description) | description ≤ 200 chars |
| L2 On Trigger | Trigger keywords match | command / skill body | ≤ 500 lines |
| L3 On Demand | Explicit reference | `references/`, `scripts/`, `templates/` | Must be linked from L2 |

Violations are caught by `specforge doctor --check-disclosure`.

### Profile System (from OpenSpec)

| Profile | Enabled Phases | Use Case |
|---------|----------------|----------|
| `minimal` | foundation, requirements, implementation, quality, release (5) | Rapid prototyping / POC |
| `standard` | All 8 phases (**default**) | Production projects |
| `custom` | User-declared `enabledPhases` | Tailored combinations |

## Quick Start

### Requirements

- Node.js ≥ **24.14.1**
- pnpm recommended (npm / yarn also work)

### Install

```bash
# global
npm install -g @namewta/specforge
# or
pnpm add -g @namewta/specforge

# or run without installing
npx @namewta/specforge --version
```

### Initialize

```bash
cd your-project
specforge init
# with a specific profile / project name
specforge init --profile standard --project-name my-app
```

Result:

```
your-project/
├── .specforge/       # framework (updatable)
└── specforge/        # user-owned (source of truth)
```

### Advance Through the Lifecycle

Each workflow command lives at `.specforge/commands/workflow/<phase>-<verb>/<phase>-<verb>.md`. AI agents load it via `@.specforge/commands/workflow/foundation-init/foundation-init.md`.

```bash
# current phase state
specforge status

# artifact DAG
specforge status --graph

# prerequisite check for a phase
specforge status --phase design --check-requires

# list commands / skills (machine-readable)
specforge list --format json
specforge list --skills --triggers=test,qa

# refresh framework assets (user assets untouched)
specforge update
```

## CLI Reference

| Command | Purpose |
|---------|---------|
| `specforge init [path]` | Bootstrap the dual directory. `--profile`, `--enabled-phases`, `--project-name`, `--force` |
| `specforge add-command` | Scaffold a command. `--type workflow-command\|tool-command --name <kebab-case>` |
| `specforge add-skill <name>` | Scaffold a skill. `--type <domain-rule\|...>`, `--mode directory\|single-file` |
| `specforge list` | List commands / skills. `--commands`, `--skills`, `--type`, `--triggers`, `--format xml\|json\|text` |
| `specforge status` | Current change's phase state. `--phase`, `--check-requires`, `--graph`, `--json` |
| `specforge update [path]` | Refresh `.specforge/` (preserves `specforge/`). `--force` |
| `specforge run-hook` | Execute `extensions.yaml` hooks. `--phase --stage before\|after --json` |
| `specforge profile show` | Show current profile. `--json` |
| `specforge profile set <name>` | Switch profile, written to `specforge/config.yaml`. `custom` requires `--enabled-phases` |
| `specforge doctor` | Diagnostics. `--check-node`, `--check-deps`, `--check-compat`, `--check-disclosure`, `--quiet` |

Global: `--no-color` disables color; `--version` / `-V` prints version.

## Concepts

### Commands vs Skills (from OpenSpec's dual-track surface)

- **Commands** — `type` ends with `-command` (`workflow-command` / `tool-command` / `devflow-command` / `gitflow-command`). Commands are **actions**, they advance phases.
- **Skills** — `type` does not end with `-command` (`domain-rule` / `code-style` / `architecture-rule` / `testing-rule` / `security-rule` / `ui-ux-rule` / `workflow-step`). Skills are **context**, they inject on trigger keywords.

Both share one 5-field frontmatter: `name / type / description / version / author`.

### Artifact DAG

```
proposal ──► design ──► tasks ──► quality-report ──► archive ──► retrospective
                       ▲
     tasks depends on both proposal and design
```

Three node states: `DONE` (file exists), `READY` (all requirements done), `BLOCKED` (at least one requirement outstanding). The graph detects cycles (three-color DFS) and rejects unknown / duplicate ids.

### Extensions Hooks (from spec-kit)

Declare `before_<phase>` / `after_<phase>` hooks in `.specforge/extensions.yaml`. Workflow commands trigger them via `specforge run-hook` inside their preamble. Required hooks block on failure; `optional: true` hooks warn only.

```yaml
hooks:
  before_release:
    - name: Security audit
      command: pnpm audit
      enabled: true
      optional: true
      timeoutMs: 60000
```

### Preamble (from gstack)

Commands and skills can embed `<!-- preamble:bash ... -->` blocks. When the agent loads the file it can parse and run the commands on demand to gather context:

```markdown
<!-- preamble:bash
specforge list --skills --triggers=test,qa --format=json
specforge status --phase=quality --check-requires
specforge doctor --check-deps --quiet
-->
```

### Hard Gates (from superpowers / Iron Laws)

Each phase has executable constraints declared in `templates/.specforge/config.yaml` under `rules.<phase>.hardGates`:

- `requirements` — unapproved proposals cannot enter design
- `design` — no contracts / error strategy means no planning
- `implementation` — no production code before tests (TDD)
- `quality` — no new verification evidence means "done" is disallowed
- `release` — no runbook, no ship

### Error Dictionary

`E001_missingPrerequisiteArtifact`, `E002_unapprovedSolution`, `E003_contractMissing`, `E004_noVerificationEvidence`, `E005_contextOverload` — all defined in `templates/.specforge/config.yaml` under `errors` so commands and skills can reference stable ids.

## Development

```bash
pnpm install         # install deps
pnpm dev -- init     # run source directly via tsx (args after --)
pnpm test            # unit + integration tests
pnpm lint            # ESLint
pnpm format          # Prettier
pnpm build           # tsc + shebang injection
pnpm build:check-bin # verify dist/cli/index.js is executable
pnpm check           # lint + test + build (also runs as prepublishOnly)
```

Project layout:

```
src/
├── cli/             # Commander routes
├── commands/        # command impls (init / add-* / list / status / update / run-hook / profile / doctor)
├── services/        # business services (scaffold / command / skill / listing / status / update / hooks)
├── core/            # domain (constants / lifecycle-types / profiles / artifact-graph / hooks / metadata-schema / ...)
├── utils/           # infra (fs / yaml / path / logger / template-renderer)
└── adapters/        # platform adapters (windows-filename-adapter)
templates/           # init templates (shipped with the npm package)
scripts/             # inject-shebang.mjs / verify-bin.mjs
tests/               # unit + integration
```

Detailed architecture and collaboration rules in [`AGENTS.md`](AGENTS.md).

## Release Pipeline

- GitHub Actions: `ci.yml` (push / PR) + `release.yml` (triggered by `v*` tags)
- Flow: setup → lint → test → build → **verify-bin** → `npm publish --provenance --access public` → GitHub Release (`softprops/action-gh-release@v2`)
- Rule: `package.json` version must match the git tag (minus the `v` prefix)
- Dependabot scans npm and GitHub Actions deps weekly

## Documentation

- [`AGENTS.md`](AGENTS.md) — AI agent collaboration guide (mandatory for contributors using AI)
- [`CHANGELOGS.md`](CHANGELOGS.md) — version history
- [`README-ZH.md`](README-ZH.md) — Chinese version of this README

## Acknowledgements

SpecForge stands on the shoulders of:

- [**OpenSpec**](https://github.com/Fission-AI/OpenSpec) by Fission-AI — dual-directory model, artifact DAG, profiles
- [**gstack**](https://github.com/garrytan/gstack) by garrytan — preamble bootstrapping, multi-perspective review
- [**superpowers**](https://github.com/obra/superpowers) by obra — Iron Laws, skill chaining, sub-agent-driven development
- [**claude-task-master**](https://github.com/eyaltoledano/claude-task-master) by eyaltoledano — PRD → tasks, complexity analysis
- [**skills**](https://github.com/anthropics/skills) by Anthropic — progressive disclosure, skill-creator methodology

Thanks to the authors of every project listed above — their prior work is the reason this CLI could be built in weeks rather than months.

## License

MIT © namewta
