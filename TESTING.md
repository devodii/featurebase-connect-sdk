# Testing this repo

Two layers: the automated test suite (fast, run anytime) and manually exercising the n8n node and the Notion sync against real accounts (slower, needs real credentials).

## 1. Automated tests

```bash
pnpm install
pnpm -r --filter "./packages/**" --filter "./integrations/*" run typecheck
pnpm -r --filter "./packages/**" --filter "./integrations/*" run test
```

That covers `packages/core` (76 tests), `integrations/notion` (16 tests), and `integrations/n8n` (the thin example, 6 tests).

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

32 more tests there (130 total). All of the above is exactly what CI runs (`.github/workflows/ci.yml`) — if it's green locally, CI will be green.

## 2. Testing the n8n node for real — no Docker needed

### One-time: get a Featurebase account

1. Sign up at [featurebase.app](https://featurebase.app) and create a workspace.
2. Create at least one **Board** so there's somewhere to create test posts.
3. Get an API key: **Settings → API** in the dashboard. Copy it.
4. Default API version pinned by this integration: `2026-01-01.nova` — leave it unless told otherwise.
5. Put your key in a gitignored `.env` at the repo root:
   ```
   FEATUREBASE_API_KEY=sk_...
   FEATUREBASE_API_VERSION=2026-01-01.nova
   WEBHOOK_URL=https://your-tunnel.ngrok-free.app/
   ```

### Node version requirement

n8n (2.41.3, the version `npm run dev` installs) requires **Node ≥24**. If your default `node -v` is older, install and switch with nvm before running dev:

```bash
nvm install 24
nvm use 24
```

Running dev under an unsupported Node version doesn't always fail loudly — it can crash the server process shortly after boot with no clear error in the truncated terminal UI. If `npm run dev` keeps dying right after startup, check your Node version first.

### Run a local n8n instance with the node loaded

```bash
cd integrations/n8n/node
set -a && source ../../../.env && set +a   # loads WEBHOOK_URL so the trigger's webhook URL matches your tunnel
npm run dev
```

This downloads and runs a real n8n server locally via `npx n8n@latest` (first run takes a minute), symlinks the built package in as a custom node under `~/.n8n-node-cli/.n8n/custom/node_modules/`, and opens `http://localhost:5678`.

**Troubleshooting a dev server that won't come up:**
- **`SyntaxError` from some deeply-nested npx module** (e.g. `mime-db/db.json`): the npx cache got corrupted, usually after a previous crash mid-download (often from a full disk). Fix: `rm -rf ~/.npm/_npx/<hash-shown-in-the-error-path>` and rerun `npm run dev` — it reinstalls clean.
- **"Unrecognized credential type: featurebaseApi" when saving the credential**: n8n's custom-node symlink folder has a stale entry from before a package rename. Check `ls ~/.n8n-node-cli/.n8n/custom/node_modules/` — if you see more than one `n8n-nodes-*` entry pointing at this repo, delete every one except the current name in `integrations/n8n/node/package.json`, then restart `npm run dev`.
- **`EBADENGINE` warnings mentioning `n8n@2.41.3` needing `node >=24.0.0`**: see the Node version section above.

### First-time n8n setup

1. First run: n8n asks you to **"Set up owner account"**. That's a one-time local login for this n8n instance only — nothing to do with Featurebase or npm. Any email/password you'll remember is fine; it never leaves your machine.
2. Skip the "what will you use n8n for" survey if it appears.
3. You land on an empty workflow canvas.

### Add the Featurebase credential

1. Click **Credentials** (left sidebar under your workspace, or add a node first and click "Create new credential" from its Credential dropdown).
2. Fields:
   - **API Key** — your real key, sent as `Authorization: Bearer <key>`.
   - **API Version** — sent as the `Featurebase-Version` header on every request. Defaults to `2026-01-01.nova`; pin it so future Featurebase API releases don't silently change your workflow's behavior.
   - **Base URL** — defaults to `https://do.featurebase.app`. Only change this if Featurebase explicitly tells you to use a different host (self-hosted/region-specific deployments).
   - **Allowed HTTP Request Domains** — this is a generic n8n security setting (not ours), restricting which domains this credential's underlying HTTP client is allowed to call. "All" is fine for local testing.
3. Click **Save**. n8n immediately runs a connection test (a real `GET /v2/boards` call) — if it fails, your key or base URL is wrong; if it succeeds you'll see a green confirmation.

## 3. Building and testing a real workflow

### The concept: what a trigger-based workflow actually does

A **Trigger** node (like "On new Featurebase event") doesn't filter by content — it fires on *every* event matching the type(s) you configure (e.g. every single "Post Created" event, no matter what the title says). If you want conditional behavior ("only do X if the post title contains Y"), you add an **IF** or **Filter** node after the trigger and put that condition there explicitly. The trigger itself is just "this category of thing happened in Featurebase, here's the data" — nothing more.

### Example: "New Post → Auto-Ack Comment"

This is end-to-end testable by doing something real in the Featurebase dashboard and watching the result appear back there.

1. Add **Featurebase → On new Featurebase event** as the first node.
2. Select your Featurebase credential.
3. Set the event type to **Post Created** (or however it's labeled in the dropdown).
4. Click **"Listen for test event"**, then go to your real Featurebase board and submit a new post. Within a few seconds the node should turn green with the real webhook payload as output — this is also how we confirm the true shape of a `post.created` webhook (see §5 below).
5. Click the `+` on the trigger node's output, search "Featurebase", pick **Comment → Create**.
6. Set:
   - **Post ID** — map from the trigger's output using the expression picker (click the field's expression icon, or type `{{ $json.<field> }}` once you know the real field name from step 4's captured payload).
   - **Content** — something obviously test-marked, e.g. `🤖 Auto-ack via n8n test workflow`.
7. Click **Execute step** on the comment node — this actually calls the live API using the captured test data.
8. Save the workflow, then use the **Publish** button (or the **Active** toggle) to make the trigger keep listening in the background.
9. **Verify for real**: go back to Featurebase, submit *another* new post, wait a few seconds, open that post in the dashboard — the auto-comment should appear on it, posted under your API key's identity. Cross-check in n8n's **Executions** tab that a matching successful execution shows up.

### Node field reference (applies across most Featurebase resources in this node)

- **Resource / Operation** — which Featurebase object (Post, Board, Comment, Changelog, etc.) and which action (Get, Get Many, Create, Update, Delete...) to perform.
- **Resource locator fields** (e.g. Board, Post ID) — a dropdown with two modes:
  - **From List** — searches live data via the API and lets you pick by name.
  - **By ID** — paste a raw Featurebase object ID directly, skipping the lookup.
- **Markdown toggle** — when ON (default), the paired Content field is treated as Markdown and converted to HTML before being sent, since Featurebase stores post/comment/changelog content as HTML. Turn it OFF to send raw HTML/plain text unconverted.
- **Simplify** — when ON (default), the response is trimmed down to a handful of useful fields per resource (e.g. just `id`/`name` for a Board) instead of the full raw API object. Turn it OFF to see the complete raw JSON Featurebase actually returned — useful when debugging real response shapes.
- **Return All / Limit** — "Return All" fetches everything; when off, "Limit" caps how many results come back. For resources where Featurebase's API genuinely supports server-side pagination (Posts, Comments, Contacts, Webhooks, etc.), this is a real `limit`/`cursor` query param. For a handful of resources it's enforced client-side instead — see the table below.

### Confirmed real pagination behavior per resource (verified against the live API, not just the docs)

| Resource list endpoint | Accepts `limit`? | What actually happens |
|---|---|---|
| Posts, Comments, Changelogs, Surveys, Contacts, Companies, Conversations, Webhooks, Help Center collections/articles/help centers, Brands | Yes | Real server-side `limit`/`cursor` pagination |
| Boards, Post Statuses | No — strict 400 | Rejects `limit` with `Unrecognized key(s) in object: 'limit'`. This node fetches everything and slices client-side. |
| Teams | No — strict 400 | Rejects **any** query object at all, not just unknown keys (`Unrecognized key(s) in object: 'query'`). This node sends no query params. |
| Admins, Custom Fields | Silently ignored | Accepts *any* query param — even garbage keys or `limit=abc` — without validating or erroring, but doesn't actually apply it either (confirmed by testing). This node fetches everything and slices client-side rather than relying on undocumented, unvalidated behavior. |

This table is why PR #6 exists — the original implementation assumed all six "simple" resources (Board/PostStatus/Admin/Team/Brand/CustomField) behaved like Brand.

## 4. Testing the Notion sync

This is a **different kind of automation** from the n8n trigger workflow above — it's a one-way, pull-based mirror, not an event listener. There's no "something happens instantly" here: you (or a schedule) run `syncPostsToNotion` periodically, and each run does:

1. Fetch all current Featurebase posts (and boards, to resolve board names).
2. For each post: if no matching Notion page exists yet (matched by the Featurebase post ID stored in a dedicated Notion property), create one. If it already exists, update it in place.

So re-running it repeatedly is always safe (it's idempotent) — it's for keeping a Notion database as a browsable, always-current mirror of your Featurebase posts, not for reacting to individual events in real time. If you want real-time reactions, that's what the n8n trigger workflow above is for.

There's no runnable script for this yet — it's an exported function meant to be called from your own script/cron/n8n workflow (e.g. an n8n **Schedule Trigger** node calling this on an interval).

### Setup

1. **Create a Notion integration**: [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration → copy the "Internal Integration Secret".
2. **Share your target database with it**: open the database in Notion → `...` menu → Connections → add the integration.
3. **Create these properties on the database** (any names — you map them explicitly, see below):
   - a **Title** property (every Notion database has exactly one; use it)
   - a **Select** for the post's status
   - a **Select** for the board name
   - a **Number** for upvotes
   - a **URL** for the post link
   - a **Text** property to store the Featurebase post id — this is the dedupe key that makes re-running safe; don't reuse it for anything else
4. **Copy the database id** from its URL: `notion.so/<workspace>/<DATABASE_ID>?v=...`

### Usage

```ts
import { createFeaturebaseClient } from './client';
import { createNotionClient } from './notion-client';
import { syncPostsToNotion } from './sync';

const featurebase = createFeaturebaseClient({ apiKey: process.env.FEATUREBASE_API_KEY! });
const notion = createNotionClient({ apiKey: process.env.NOTION_API_KEY! });

const result = await syncPostsToNotion({
	featurebase,
	notion,
	databaseId: process.env.NOTION_DATABASE_ID!,
	propertyNames: {
		title: 'Title',
		status: 'Status',
		board: 'Board',
		upvotes: 'Upvotes',
		url: 'URL',
		featurebasePostId: 'Featurebase Post ID',
	},
});

console.log(`Created ${result.created}, updated ${result.updated}`);
```

`propertyNames` is an explicit map (not hardcoded names) because every Notion workspace names its database columns differently. See `integrations/notion/README.md` for more notes, including which pieces of Notion's own API behavior are still `@unchecked` (not yet verified against a live Notion account the way the Featurebase side has been).

## 5. Known open items

- Webhook payload shapes for trigger events beyond what's been manually captured so far are still `@unchecked` in `reference/FINDINGS.md` — confirm each one the same way §3's example workflow does (Listen for test event → trigger the real thing in Featurebase → inspect the captured JSON).
- Notion-side behavior (exact API version string, rate-limit threshold) is still based on Notion's published docs, not re-verified against a live account.
- Real npm publish of the n8n node only happens once `NPM_TOKEN` is added to the repo's GitHub secrets and the Changesets bot's version-bump PR is merged after that.
