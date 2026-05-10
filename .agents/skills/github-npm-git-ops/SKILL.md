---
name: github-npm-git-ops
description: End-to-end npm package release workflow through GitHub Actions — authoring the CI/CD workflow YAML, preparing package.json for publication, tagging versions, and troubleshooting the full chain from git push to successful npm publish with provenance. Use when the user wants to set up or debug npm package release automation, publish a new version via tag, fix a failing release workflow, configure NPM_TOKEN / provenance / scoped packages, or create a GitHub Release alongside npm publish. Triggers on phrases like "release npm package", "publish to npm", "set up release workflow", "CI release failed", "npm provenance", "tag and release", "publish scoped package".
---

# GitHub + npm + Git Release Operations

Ship an npm package reliably via a tag-triggered GitHub Actions workflow. The package is built, tested, published to npm (with provenance), and a matching GitHub Release is created — all from one `git push` of a version tag.

## When to Activate

- Setting up a new release pipeline for an npm package
- Diagnosing a failing `Release` workflow (E403, E404, E422, EUSAGE, provenance errors)
- Publishing a scoped package (`@scope/name`) for the first time
- Migrating from manual `npm publish` to tag-driven CI/CD releases
- Cutting a new version tag (`vX.Y.Z`) and monitoring rollout

## Release Flow at a Glance

```
1. package.json ready (name, version, bin, files, repository)
       ↓
2. .github/workflows/release.yml exists with correct permissions
       ↓
3. NPM_TOKEN secret configured (Granular Access Token, not Classic)
       ↓
4. git commit → git push origin main
       ↓
5. git tag vX.Y.Z (matching package.json version) → git push origin vX.Y.Z
       ↓
6. Release workflow triggers → lint / test / build → npm publish --provenance → GitHub Release
       ↓
7. Verify: npm view @scope/pkg version  &&  gh release list
```

## Preflight Checklist (before the first release)

Run through this list before pushing any tag. Every item here has caused a failed release in practice.

### package.json must have

- [ ] `name` — if scoped, must match npm scope you own (e.g., `@namewta/specforge`)
- [ ] `version` — matches the tag (`v0.0.2` ↔ `"version": "0.0.2"`)
- [ ] `repository.url` — **required** for npm provenance, must match the actual GitHub repo URL
- [ ] `bin` paths prefixed with `./` (e.g., `"./dist/cli/index.js"`)
- [ ] `files` — explicit allowlist so the tarball does not ship source / tests
- [ ] `type: "module"` and `exports` correctly resolve
- [ ] `prepublishOnly` script runs the full quality gate (`lint && test && build`)

Minimal snippet:

```json
{
  "name": "@namewta/specforge",
  "version": "0.0.2",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/NAMEWTA/specforge"
  },
  "homepage": "https://github.com/NAMEWTA/specforge#readme",
  "bugs": { "url": "https://github.com/NAMEWTA/specforge/issues" },
  "bin": { "specforge": "./dist/cli/index.js" },
  "files": ["dist", "templates"]
}
```

### GitHub repository must have

- [ ] Secret `NPM_TOKEN` set to a **Granular Access Token** (not Classic) with read+write for the target package/scope and 2FA bypass enabled
- [ ] Actions enabled and the workflow file committed to the default branch
- [ ] `id-token: write` and `contents: write` permissions granted in the workflow

### For first-time scoped package publish

- [ ] Pass `--access public` to `npm publish` (scoped packages default to private)
- [ ] Verify the scope exists on npm and your account owns it

## The Release Workflow YAML

Store this at `.github/workflows/release.yml`. Triggered on `v*` tags only.

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
      id-token: write        # required for npm provenance (OIDC)
      contents: write        # required to create GitHub Release
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup environment
        uses: ./.github/actions/setup   # or inline setup-node + pnpm
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

      # npm publish goes BEFORE GitHub Release:
      # npm publish is irreversible, so do the risky thing first.
      # If GitHub Release fails, the npm artifact is still live.
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

Key flags to remember:

- `--provenance` — signs the package via sigstore; requires `id-token: write` and a correct `repository.url`
- `--access public` — required for scoped packages on first publish
- The tag-version guard step prevents publishing a mismatched `package.json`

## Tag and Release Procedure

Once the workflow YAML and `package.json` are in place, the release itself is three commands:

```bash
# 1. Make sure main is clean and pushed
git status
git push origin main

# 2. Create and push the tag (must match package.json version)
git tag v0.0.2
git push origin v0.0.2

# 3. Monitor the workflow
gh run watch   # or: gh run list --workflow release.yml --limit 3
```

### Retrying a failed release

The release workflow is idempotent up to the `npm publish` step. If publish succeeded but later steps failed, **do not** bump the version; just fix the follow-up step. If publish itself failed, you must:

```bash
# Delete the local and remote tag
git tag -d v0.0.2
git push origin :refs/tags/v0.0.2

# Fix the underlying issue, commit, push
git add . && git commit -m "fix: ..."
git push origin main

# Re-tag and re-push
git tag v0.0.2
git push origin v0.0.2
```

npm **does not** allow republishing the exact same `version` number, so if `npm publish` actually uploaded the tarball, bump to the next patch (`0.0.3`) instead of retrying.

## Troubleshooting by Error Code

When the workflow fails, get the logs first:

```bash
gh run list --workflow release.yml --limit 3 --json databaseId,conclusion,displayTitle
gh run view <databaseId> --log-failed | grep -E "npm error|##\[error\]"
```

Then match the error to the table below.

| Error                                                          | Root cause                                                         | Fix                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm error code E404 ... PUT /pkg - Not found`                 | Package name taken by another user, or no publish permission       | Rename to a scoped package (`@you/pkg`) or request ownership transfer                                                                                      |
| `npm error code E403 ... Two-factor authentication ... required` | Using a Classic npm token; npm now requires 2FA bypass             | Generate a **Granular Access Token** on npmjs.com, select the target package/scope, update `NPM_TOKEN` secret                                              |
| `npm error code EUSAGE ... must set access to public`          | Publishing a scoped package without `--access public`              | Add `--access public` to `npm publish`                                                                                                                     |
| `npm error code E422 ... Error verifying sigstore provenance ... "repository.url" is ""` | `package.json` missing `repository` field                          | Add `repository.url` pointing to the GitHub repo                                                                                                           |
| `Tag version (X) does not match package.json version (Y)`      | Version drift between tag and manifest                             | Either re-tag with the correct version or bump `package.json` and recommit before re-tagging                                                               |
| `bin[name] script was invalid and removed`                     | `bin` path missing `./` prefix (npm auto-corrects with a warning)  | Update `package.json` to `"./dist/..."`. Safe to ignore if path is already correct — the warning is sometimes a false positive.                            |
| Workflow never triggers                                        | Tag pushed but workflow trigger doesn't match                      | Confirm the tag matches `v*` pattern and was pushed (`git push origin <tag>`); `git push --tags` is fine too                                               |

## Provenance Requirements (critical)

npm provenance (`--provenance`) signs the package so consumers can verify it was built from a specific commit in a specific repo. For it to work:

1. `id-token: write` permission in the workflow job
2. `repository.url` in `package.json` must **exactly** match the GitHub repo the workflow runs in
3. The workflow must run in GitHub Actions (not a self-hosted forge)
4. The commit being published must be reachable from the workflow checkout

If provenance verification fails, npm returns `E422`. Read the error message carefully — it names the mismatched field.

## Quality Gate

Before declaring the release done, verify all three artifacts:

```bash
# 1. npm package is live (may take 30-60s to propagate)
npm view @namewta/specforge version
npm view @namewta/specforge dist-tags

# 2. GitHub Release exists and is marked Latest
gh release list --limit 3
gh release view v0.0.2

# 3. Workflow concluded successfully
gh run list --workflow release.yml --limit 1 --json conclusion
```

If any of the three are missing, the release is incomplete — investigate before announcing.

## Related References

Deep dives live in [references/](references/):

- [setup-npm-token.md](references/setup-npm-token.md) — step-by-step Granular Access Token creation and GitHub secret wiring
- [package-json-checklist.md](references/package-json-checklist.md) — full `package.json` field-by-field explanation for publishable packages
- [workflow-yaml-reference.md](references/workflow-yaml-reference.md) — annotated full release.yml with permission / action / step explanations
- [troubleshooting-playbook.md](references/troubleshooting-playbook.md) — extended error catalog with real failure transcripts and diagnosis workflow
