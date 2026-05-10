---
name: github-ops
description: GitHub 仓库运营与 npm 发布自动化一体化工作流。覆盖 issue 分诊、PR 管理、CI/CD 排错、安全告警监控、Release 准备，以及通过 GitHub Actions 打 tag 触发 npm publish（含 provenance、scoped 包、GitHub Release 联动）的全链路。适用场景：用户让你「check GitHub」「triage issues」「review PRs」「merge」「CI is broken」「release npm package」「publish to npm」「set up release workflow」「CI release failed」「npm provenance」「tag and release」「publish scoped package」，或任何需要基于 gh CLI 进行 GitHub 操作、npm 发布自动化、仓库治理、社区健康维护的任务。
---

# GitHub 运营与发布工作流

用 `gh` CLI + GitHub Actions 闭环管理一个开源/私有仓库：日常治理（issue、PR、CI、安全）+ 发布上线（tag 触发 npm publish + GitHub Release）。

本技能把仓库当成一个持续运转的系统：入口是 issue/PR 的流入，出口是带 provenance 的 npm 包与 GitHub Release。两端之间是 CI/CD 与安全监控。

## 何时激活

**日常运营**

- 分诊、打标签、回复 issue；清理 stale item
- 审查 PR、检查 CI 状态、合并或驳回
- 排查失败的 CI 任务（区分真实失败与 flaky）
- 监控 Dependabot / secret scanning 告警

**发布上线**

- 为 npm 包搭建 tag 触发的 release pipeline
- 排查失败的 `Release` workflow（E403/E404/E422/EUSAGE/provenance 错误）
- 首次发布 scoped 包 `@scope/name`
- 从手动 `npm publish` 迁移到 tag 驱动的 CI 发布
- 切新版本 tag（`vX.Y.Z`）并跟踪上线

## 前置工具

- 已安装并登录 `gh`（`gh auth login`）
- 仓库目标分支有 Actions 权限，能读写 secrets
- 发布类任务额外需要：npm 账号 + Granular Access Token（见 [references/setup-npm-token.md](references/setup-npm-token.md)）

## 两条核心流

### 流 1：日常治理

```
issue/PR 流入
  → 分诊（类型 + 优先级 + 标签）
  → 审查（CI 状态 + 变更质量 + 测试）
  → 合并 or 清理 stale
  → 安全告警每周巡检
```

### 流 2：发布上线

```
package.json 就绪 (name/version/bin/files/repository)
  → .github/workflows/release.yml 存在（权限齐全）
  → NPM_TOKEN secret 配置（Granular + 2FA bypass）
  → git push main → git tag vX.Y.Z → git push origin vX.Y.Z
  → Release workflow：lint/test/build → npm publish --provenance → GitHub Release
  → 三端验证：npm view / gh release list / gh run list
```

## 日常治理操作手册

### Issue 分诊

**分类维度**：

- 类型：bug / feature-request / question / documentation / enhancement / duplicate / invalid / good-first-issue
- 优先级：critical（破坏/安全）/ high（显著影响）/ medium / low（外观）

**标准流程**：

1. 读 title、body、comments
2. 搜重复（`gh issue list --search "关键词" --state all --limit 20`）
3. 打标签（`gh issue edit <N> --add-label "bug,high-priority"`）
4. 问题类：请求复现步骤；重复类：引用原 issue 并加 `duplicate`
5. 新手友好的加 `good-first-issue`

```bash
gh issue list --search "关键词" --state all --limit 20
gh issue edit <number> --add-label "bug,high-priority"
gh issue comment <number> --body "感谢反馈，能否补充复现步骤？"
```

### PR 审查

审前检查：

1. CI：`gh pr checks <N>`
2. 可合并性：`gh pr view <N> --json mergeable`
3. 年龄与最后活跃时间
4. 超过 5 天无 review 的标记跟进
5. 社区 PR：确认测试与规范

### Stale 策略

- Issue 14 天无活动 → 加 `stale` 并询问近况
- PR 7 天无活动 → 询问是否仍在推进
- 30 天无响应 → 加 `closed-stale` 并关闭

```bash
gh issue list --label "stale" --state open
gh pr list --json number,title,updatedAt \
  --jq '.[] | select(.updatedAt < "2026-03-01")'
```

### CI 排障

```bash
gh run list --status failure --limit 10
gh run view <run-id> --log-failed
gh run rerun <run-id> --failed
```

- 区分真实失败 vs flaky：看是否可稳定复现
- 真实失败：定位根因并提修复
- Flaky：记录模式，别只 rerun 了事

### 安全告警

```bash
# Dependabot 告警
gh api repos/{owner}/{repo}/dependabot/alerts \
  --jq '.[].security_advisory.summary'

# Secret scanning
gh api repos/{owner}/{repo}/secret-scanning/alerts --jq '.[].state'

# 自动合并安全的依赖升级
gh pr list --label "dependencies" --json number,title
```

每周至少一次巡检；critical/high 立即处理。

## 发布上线操作手册

### 发布前自检清单

发布新包或新版本前，逐项确认。任意一项缺失都可能让 workflow 失败。

**package.json 必备**：

- `name` — scoped 包要匹配你拥有的 npm scope（如 `@namewta/specforge`）
- `version` — 严格等于将要打的 tag（`v0.0.2` ↔ `"0.0.2"`）
- `repository.url` — **npm provenance 强制要求**，必须匹配实际 GitHub 仓库
- `bin` 路径以 `./` 开头（如 `"./dist/cli/index.js"`）
- `files` — 显式白名单，防止把源码/测试发到 npm
- `type: "module"` 与 `exports` 配置正确
- `prepublishOnly` 跑完整质量闸（`lint && test && build`）

完整字段解释见 [references/package-json-checklist.md](references/package-json-checklist.md)。

**GitHub 仓库必备**：

- `NPM_TOKEN` secret 是 **Granular Access Token**（不是 Classic）、2FA bypass 已开、读写权限覆盖目标包/scope
- Actions 已启用，workflow 文件已推到默认分支
- Workflow 中声明 `id-token: write` + `contents: write`

**首次发布 scoped 包额外**：

- 向 `npm publish` 传 `--access public`（scoped 默认 private）
- npm 上该 scope 已存在且由你拥有

### release.yml 模板

存放在 `.github/workflows/release.yml`，只在 `v*` tag 上触发。

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    name: Release to npm
    permissions:
      id-token: write # npm provenance (OIDC)
      contents: write # 创建 GitHub Release
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup environment
        uses: ./.github/actions/setup
        with:
          registry-url: 'https://registry.npmjs.org'

      - name: Verify tag matches package version
        run: |
          TAG="${{ github.ref }}"
          TAG_VERSION="${TAG#refs/tags/v}"
          PACKAGE_VERSION=$(node -e "console.log(require('./package.json').version)")
          if [ "$TAG_VERSION" != "$PACKAGE_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) does not match package.json version ($PACKAGE_VERSION)"
            exit 1
          fi

      - name: Run lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Verify bin entry
        run: node scripts/verify-bin.mjs

      # npm publish 在 GitHub Release 之前：
      # publish 不可回滚，先做最危险的动作。
      # 若 Release 步骤失败，npm 产物至少已上线。
      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        if: success()
        with:
          tag_name: ${{ github.ref_name }}
          name: Release ${{ github.ref_name }}
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

逐行注解与常见变体见 [references/workflow-yaml-reference.md](references/workflow-yaml-reference.md)。

关键开关：

- `--provenance`：sigstore 签名，依赖 `id-token: write` 与正确的 `repository.url`
- `--access public`：scoped 包首次发布必需
- tag-version 校验步骤：防止版本漂移直接发坏版本

### 打 tag 与发布流程

workflow 与 `package.json` 就绪后，发布只是三条命令：

```bash
# 1. 确保 main 干净且已推送
git status
git push origin main

# 2. 打 tag（版本号必须与 package.json 一致）
git tag v0.0.2
git push origin v0.0.2

# 3. 盯 workflow
gh run watch   # 或：gh run list --workflow release.yml --limit 3
```

### 重试失败的发布

Workflow 在 `npm publish` 之前都是幂等的：

- publish 前失败：修好后删旧 tag 重推同一版本号
- publish 已成功但后续失败：**不要**改版本号，只补执行后续步骤（手动 `gh release create`）
- publish 本身失败（tarball 未上传）：删 tag、改代码、重新打同 tag

```bash
# 删本地与远端 tag
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2

# 修复、提交、推送
git add . && git commit -m "fix: ..."
git push origin main

# 重新打 tag
git tag v0.0.2
git push origin v0.0.2
```

**npm 不允许重发相同 `version`**——哪怕 unpublish 过也不行。若 publish 真的上传成功，只能 bump 到下一个补丁（`0.0.3`）。

### Release 准备（非发布本身）

准备发布一个新版本时的工作流：

1. 确认 main 上 CI 全绿
2. 梳理未发布变更：`gh pr list --state merged --base main --search "merged:>YYYY-MM-DD"`
3. 生成 changelog（workflow 会自动，手动也可）
4. bump 版本 → 打 tag → push → 走 release pipeline

```bash
# 列最近一次发布以来合并的 PR
gh pr list --state merged --base main --search "merged:>2026-03-01"

# 预发（可选）
gh release create v1.3.0-rc1 --prerelease --title "v1.3.0 RC1"
```

## Release 故障排查

遇到失败先走统一诊断：

```bash
gh run list --workflow release.yml --limit 5 \
  --json databaseId,conclusion,displayTitle
gh run view <databaseId> --log-failed 2>&1 \
  | grep -E "npm error|npm warn publish|##\[error\]|Error:" | head -30
```

常见错误速查：

| 错误                                            | 根因                             | 快速修复                                                  |
| ----------------------------------------------- | -------------------------------- | --------------------------------------------------------- |
| `E404 Not found` 发布时                         | 包名被占用或无权限               | 改 scoped 名或联系 owner                                  |
| `E403 Two-factor authentication required`       | Classic token 或未开 2FA bypass  | 改用 Granular Token 并勾选 bypass                         |
| `EUSAGE must set access to public`              | scoped 包未加 `--access public`  | 加上 `--access public`                                    |
| `E422 Error verifying sigstore provenance`      | `repository.url` 缺失或不匹配    | 补 `repository.url`，严格匹配 GitHub repo                 |
| `Tag version X does not match package.json Y`   | 版本漂移                         | 删 tag、改 `package.json`、重打                           |
| `bin[name] script was invalid and removed`      | `bin` 路径缺 `./`                | 改成 `"./dist/..."`（也可能是 npm 误报，看最终有无 `+ @scope/pkg@version`） |
| Workflow 没触发                                 | tag 不匹配 `v*` 或未推送         | 确认 tag 名并 `git push origin <tag>`                     |

完整失败案例与修复流程见 [references/troubleshooting-playbook.md](references/troubleshooting-playbook.md)。

## 质量闸门

任何一次任务完成前，按下面的清单自检：

**治理类**

- 所有分诊的 issue 都有合适标签
- 没有超过 7 天未 review/comment 的 PR
- CI 失败都做了根因分析（不只是 rerun）
- 安全告警已确认或登记跟进

**发布类**

```bash
# 1. npm 包已上线（CDN 传播需 30–60 秒）
npm view @namewta/specforge version
npm view @namewta/specforge dist-tags

# 2. GitHub Release 存在且标记为 Latest
gh release list --limit 3
gh release view v0.0.2

# 3. Workflow 最终状态为 success
gh run list --workflow release.yml --limit 1 --json conclusion
```

三端任一缺失都说明发布未完成，不要对外宣布。

## 相关资料

深入细节见 [references/](references/)：

- [setup-npm-token.md](references/setup-npm-token.md) — Granular Access Token 生成与 GitHub Secret 绑定
- [package-json-checklist.md](references/package-json-checklist.md) — 发布前逐字段检查清单
- [workflow-yaml-reference.md](references/workflow-yaml-reference.md) — `release.yml` 完整注解与变体
- [troubleshooting-playbook.md](references/troubleshooting-playbook.md) — 真实失败记录的排错手册
- [issue-pr-triage.md](references/issue-pr-triage.md) — Issue/PR 分诊标签体系与社区 PR 标准
- [ci-and-security-ops.md](references/ci-and-security-ops.md) — CI 排障与安全告警巡检模板
