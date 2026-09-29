# Testing this repo

Two layers: the automated test suite (fast, run anytime) and manually exercising the n8n node and the Notion sync against real accounts (slower, needs real credentials).

## 1. Automated tests

```bash
pnpm install
pnpm -r --filter "./packages/**" --filter "./integrations/*" run typecheck
pnpm -r --filter "./packages/**" --filter "./integrations/*" run test
```

That covers `packages/core`, `integrations/notion`, and `integrations/n8n` (the thin example) — currently 86 tests.

The published n8n node (`integrations/n8n/node`) is npm-managed, not part of the pnpm workspace, so it's checked separately:

```bash
cd integrations/n8n/node
npm ci
npx tsc --noEmit
npx eslint .
npm run build
npm test
npx prettier --check .
```

27 more tests there (113 total). All of the above is exactly what CI runs (`.github/workflows/ci.yml`) — if it's green locally, CI will be green.

## 2. Testing the n8n node for real — no Docker needed

### One-time: get a Featurebase account

1. Sign up at [featurebase.app](https://featurebase.app) and create a workspace.
2. Create at least one **Board** so there's somewhere to create test posts.
3. Get an API key: **Settings → API** in the dashboard. Copy it.
4. Default API version pinned by this integration: `2026-01-01.nova` — leave it unless told otherwise.

### Run a local n8n instance with the node loaded

```bash
cd integrations/n8n/node
npm run dev
```

This downloads and runs a real n8n server locally via `npx n8n@latest` (first run takes a minute), symlinks the built package in as a custom node, and opens `http://localhost:5678`.

- First run: n8n asks you to create a local owner account. That's a throwaway local login, unrelated to Featurebase.
- **Credentials → New → Featurebase API** → paste your real API key → **Test** (this calls `GET /v2/boards` for real — confirms the key works immediately).
- Drag a **Featurebase** node into a workflow, pick a resource (start with **Post → Get Many**), execute it manually — you should see real data back.

**Testing the Trigger node** needs your local instance to be reachable from the internet (Featurebase has to be able to deliver webhooks to it), which `localhost` isn't by default. Use a tunnel — [ngrok](https://ngrok.com) or similar — pointed at port 5678, and set n8n's webhook URL to the tunnel's public URL. Test the action node first; only bother with the tunnel once you're ready to test triggers specifically.

## 3. Testing the Notion sync

There's no runnable script for this yet — `syncPostsToNotion` is an exported function, meant to be called from your own script/cron/n8n workflow. See `integrations/notion/README.md` for the exact usage snippet.

Setup needed:

1. A Notion integration: [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration → copy the secret.
2. A Notion database, shared with that integration (`...` menu → Connections), with these properties: Title (default), a Select for status, a Select for board, a Number for upvotes, a URL, and a Text field for the Featurebase post id (the dedupe key — don't reuse it for anything else).
3. The database id from its URL.

## 4. Known open items

- **npm package name**: currently `n8n-nodes-featurebase`, but that name is already taken by an unrelated package on npm — a rename to `n8n-nodes-featurebase-connect` plus a Changesets-based publish pipeline is in progress as a separate PR. Once merged, `npm install n8n-nodes-featurebase-connect` replaces the current install instructions.
- Real npm publish only happens once `NPM_TOKEN` is added to the repo's GitHub secrets and the Changesets bot's version-bump PR is merged after that.
