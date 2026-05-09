# SpecForge CLI

**AI-native spec-driven development workflow tool** — synthesizing best practices from OpenSpec, gstack, superpowers-zh, spec-kit, skills-main, claude-task-master, and grill-me.

SpecForge is a unified workflow orchestration platform that bridges specification, design, planning, implementation, and quality assurance through an intelligent lifecycle framework. Built for modern AI-assisted development teams.

## 🎯 Project Vision

SpecForge integrates proven design patterns from multiple mature projects:

- **[OpenSpec]** — Dual-directory separation model, artifact DAG, Progressive Disclosure
- **[gstack]** — Preamble-tier initialization, multi-perspective review system
- **[superpowers-zh]** — Skill chain orchestration, Iron Laws enforcement, subagent-driven development
- **[spec-kit]** — Extension hooks, Constitution governance, explicit Handoffs
- **[skills-main]** — Skill creation methodology, progressive disclosure patterns
- **[claude-task-master]** — Handlebars templating, complexity analysis
- **[grill-me]** — Multi-perspective questioning frameworks

See [reference-projects-analysis.md](references/reference-projects-analysis.md) for detailed analysis of each project's unique contributions.

## 🚀 Installation

```bash
npm install -g @namewta/specforge
# 或
pnpm add -g @namewta/specforge
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `specforge init [path]` | Initialize SpecForge in your project |
| `specforge add-skill <name>` | Create a new skill |
| `specforge add-command --type <type> --name <name>` | Create a new command |
| `specforge list` | List commands and skills |
| `specforge status` | Query phase and artifact DAG status |
| `specforge profile <show\|set>` | View or switch lifecycle profiles |
| `specforge run-hook --phase <name> --stage <before\|after>` | Run extension hooks |
| `specforge update [path]` | Update SpecForge framework assets |
| `specforge doctor` | Run diagnostics on the project structure |

## 🔄 8-Phase Lifecycle

SpecForge combines spec-driven methodology with intelligent task orchestration across 8 phases:

```
foundation → requirements → design → planning → implementation → quality → release → evolution
```

Each phase produces artifacts (specs, plans, tasks, tests) that form a **production artifact DAG**, enabling partial execution and incremental development.

| Phase | Role | Representative Pattern |
|-------|------|------------------------|
| **foundation** | Constitution & governance setup | Constitution governance (spec-kit) |
| **requirements** | Explore, clarify, brainstorm | Multi-perspective questioning (grill-me) |
| **design** | Architecture & technical planning | Multi-angle design review (gstack) |
| **planning** | Task decomposition & sequencing | Complexity analysis (claude-task-master) |
| **implementation** | Code delivery with subagents | Subagent-driven development (superpowers-zh) |
| **quality** | Testing, review, verification | Three-tier QA & IR Laws (gstack, superpowers-zh) |
| **release** | Deployment & operationalization | Release orchestration (gstack) |
| **evolution** | Learning, refinement, archive | Pattern solidification & skillification (gstack, superpowers-zh) |

## 📦 Profile System

Profiles control which workflow phases are scaffolded and displayed:

- **`minimal`** — foundation, requirements, implementation, quality, release  
  *For lean teams or greenfield projects*
- **`standard`** — all 8 phases (default)  
  *For comprehensive spec-driven workflows*
- **`custom`** — explicit `profile.enabledPhases` in `specforge/config.yaml`  
  *For tailored organizational workflows*

```bash
specforge init ./my-project --profile=standard
specforge profile show
specforge profile set custom --enabled-phases=foundation,requirements,implementation,quality,release
```

## 🔌 Extension Hooks

Projects declare lifecycle hooks in `.specforge/extensions.yaml`:

```yaml
hooks:
  before_implementation:
    - name: security-scan
      script: ./scripts/security-check.sh
      optional: false
  after_quality:
    - name: notify-slack
      script: ./scripts/notify.sh
      optional: true
```

**Inspired by:** spec-kit's extension hook architecture.

## 🌐 Language-Agnostic Workflow Steps

SpecForge templates describe abstract actions (test, lint, build, sync); concrete commands are loaded per-language from:

```
.specforge/skills/workflow-steps/language-adapters/SKILL.md
```

**Examples:**

```bash
# Python
pytest tests/
ruff check .
python -m build

# Node.js
npm test
eslint .
npm run build

# Java
mvn test
mvn spotless:check
mvn package
```

## 🗂️ Project Structure

After `specforge init`, your project has:

```
project/
├── .specforge/                    # Framework assets (managed by specforge update)
│   ├── commands/                  # Lifecycle phase commands
│   ├── skills/
│   │   ├── architecture/
│   │   ├── code-styles/
│   │   ├── domain-rules/
│   │   ├── security/
│   │   ├── testing/
│   │   ├── ui-ux/
│   │   └── workflow-steps/
│   └── templates/
└── specforge/                     # User-managed assets
    ├── project.md                 # Project metadata
    ├── context/                   # Project context documents
    ├── spec/                      # Specification artifacts
    ├── changes/                   # Active change proposals
    └── archive/                   # Completed changes
```

**Key Design:** Dual-directory separation (inspired by OpenSpec) ensures framework updates don't overwrite user content.

## 💻 Development

```bash
# Run CLI in dev mode
pnpm dev -- --help

# Build TypeScript
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm lint
pnpm format

# Full check (lint + test + build)
pnpm check
```

## 📚 Learning Resources

- [Detailed Reference Analysis](references/reference-projects-analysis.md) — Comprehensive breakdown of all 7 source projects
- [CLAUDE.md](CLAUDE.md) — Architecture, design decisions, and developer guide (中文)
- [Individual References](references/) — Source projects' full codebases

## 🔑 Key Design Principles

1. **Artifact DAG** — Phase products form a directed acyclic graph; status queries reveal readiness at a glance (OpenSpec)
2. **Skill Orchestration** — Skills chain explicitly; completion of one phase recommends the next (superpowers-zh)
3. **Iron Laws** — Unbreakable rules with pre-countered objections prevent common mistakes (superpowers-zh)
4. **Constitution Governance** — Immutable project principles gate design and implementation decisions (spec-kit)
5. **Preamble-Tier Initialization** — Skills self-initialize with environment checks and context loading (gstack)
6. **Extension Hooks** — Users customize workflows without modifying framework (spec-kit)
7. **Subagent-Driven Development** — Complex tasks dispatch parallel specialized agents (superpowers-zh, gstack)
8. **Progressive Disclosure** — Information loaded on-demand; metadata always available (OpenSpec, skills-main)

## 📝 License

MIT
