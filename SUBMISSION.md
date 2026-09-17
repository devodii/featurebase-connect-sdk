# Publishing and verification

This documents the exact current process for publishing `n8n-nodes-featurebase` to npm and submitting it for n8n community node verification, as of the sources checked while building this package: `docs.n8n.io/integrations/community-nodes/building-community-nodes`, `docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines`, and `docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes`.

## Pre-publish checklist

- [x] Package name starts with `n8n-nodes-` (`n8n-nodes-featurebase`).
- [x] `package.json` keywords include `n8n-community-node-package`.
- [x] `package.json`'s `n8n` block lists the credential and both nodes.
- [x] Zero runtime dependencies (`n8n-workflow` is a `peerDependency`, everything else is a `devDependency`).
- [x] Written in TypeScript with `strict: true`.
- [x] License is MIT (`LICENSE`, and `"license": "MIT"` in `package.json`).
- [x] `repository.url` and `homepage` point at the actual public GitHub repo (`github.com/devodii/n8n-nodes-featurebase`), matching the npm author.
- [x] The code never reads `process.env` or touches the filesystem; all input comes through node parameters and credentials.
- [x] Both nodes are programmatic style (`execute()` / `webhook()` classes implementing `INodeType`), not declarative-routing style, as required for a package that also ships a trigger.
- [x] Single third-party service (Featurebase only) - no unrelated APIs bundled in.
- [x] README documents installation, credentials, every resource/operation, and usage examples.
- [x] `npm run lint` and `npm run build` pass clean, `npm test` passes (see CI).
- [x] `.github/workflows/publish.yml` exists for the GitHub-Actions-with-provenance publishing path required from May 1 2026.
- [x] `npm pack --dry-run` produces a clean tarball with no build cache artifacts (`.tsbuildinfo` is written outside `dist/`, see `tsconfig.json`).

## One-time npm setup

Pick one:

**Trusted publishing (recommended, no long-lived secret):**

1. Publish the package to npm manually once (`npm publish` from a local machine, logged in as the intended npm account) so the package name exists.
2. On npmjs.com, open the package's settings > **Publish access** > **Trusted Publishers** > **Add a publisher**.
3. Fill in:
   - Repository owner: `devodii`
   - Repository name: `n8n-nodes-featurebase`
   - Workflow name: `publish.yml`
   - Environment: leave blank
4. Leave `NPM_TOKEN` unset in the repo's GitHub secrets - the workflow uses OIDC instead.

**npm automation token (fallback):**

1. On npmjs.com: **Access Tokens** > **Generate New Token** > **Granular Access Token**, scoped to this package with publish permission.
2. In GitHub: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**, name it `NPM_TOKEN`.

## Release process

```bash
npm run release
```

Run locally, this lints, builds, prompts for a version bump, updates the changelog, commits, tags, and pushes - it does **not** publish to npm. The tag push triggers `.github/workflows/publish.yml`, which runs the same `n8n-node release` command again, but this time inside GitHub Actions (detected via the `GITHUB_ACTIONS` environment variable), where it publishes to npm with a provenance attestation instead.

`package.json`'s `prepublishOnly` script (`n8n-node prerelease`) deliberately makes a direct `npm publish` fail locally, printing "Run `npm run release` to publish the package" - this is intentional, not a bug: it forces every release through the GitHub Actions path required for verification. `n8n-node release` has a `--publish` flag for a direct local npm publish, but it explicitly forfeits provenance and verification eligibility, so this package does not use it.

## Verify locally before tagging a release

```bash
npm run lint
npm run build
npm test
npm pack --dry-run
```

After the package is live on npm, run the official scanner (it fetches the published package from the registry, so it cannot run against a local, unpublished checkout):

```bash
npx @n8n/scan-community-package n8n-nodes-featurebase
```

## Submitting for verification

1. Confirm the package is published to npm via the GitHub Actions workflow above (with a provenance statement).
2. Go to the [n8n Creator Portal](https://creators.n8n.io/nodes).
3. Sign up or log in.
4. Submit the package for verification through the portal.

n8n does final vetting after submission and reserves the right to reject nodes that compete with paid or enterprise Featurebase-equivalent functionality; this package only wraps Featurebase's own public REST API, so that shouldn't apply.

## Draft npm README summary

> n8n community node for Featurebase (feedback boards, changelogs, help center, and support conversations). Includes a real webhook trigger with 26 event topics, 7 derived events, and dedupe; a full action node for every confirmed Featurebase REST resource; and four composite Workflow Helpers (feedback dedupe/upsert, revenue-weighted scoring, bulk import, and status+changelog automation). Zero runtime dependencies. Built directly from Featurebase's OpenAPI spec - see `reference/FINDINGS.md` for exactly what's confirmed and what isn't.
