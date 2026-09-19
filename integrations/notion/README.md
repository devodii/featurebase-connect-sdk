# Featurebase → Notion sync

Mirrors your Featurebase posts into a Notion database: creates a page for a post that doesn't have one yet, updates the page for one that does, so re-running the sync is always safe.

## Setup

1. **Create a Notion integration**: [notion.so/my-integrations](https://www.notion.so/my-integrations) → New integration → copy the "Internal Integration Secret" (starts with `secret_` or `ntn_`).
2. **Share your database with it**: open the target database in Notion → `...` menu → Connections → add the integration you just created.
3. **Create these properties on the database** (any names you like, as long as `propertyNames` below points at them):
   - a **Title** property (Notion databases always have exactly one; use it)
   - a **Select** property for the post's status (e.g. "Status")
   - a **Select** property for the board name (e.g. "Board")
   - a **Number** property for upvotes (e.g. "Upvotes")
   - a **URL** property for the post link (e.g. "URL")
   - a **Text** property to store the Featurebase post id (e.g. "Featurebase Post ID") - this is the dedupe key, don't reuse it for anything else.
4. **Copy the database id** from its URL: `notion.so/<workspace>/<DATABASE_ID>?v=...`.

## Usage

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

Run this on a schedule (a cron job, a GitHub Action, an n8n Schedule Trigger calling a small script) to keep the two in sync.

## Notes

- `propertyNames` exists because every Notion workspace names its database columns differently - there's no way to guess this correctly, so it's an explicit map instead of a hardcoded assumption.
- The board name lookup (`listBoards`) runs once per sync, not once per post.
- Anything tagged `@unchecked-*` in `notion-client.ts` (the exact API version string, the precise rate-limit threshold) reflects Notion's published docs at the time this was written, not something re-verified against a live account - worth a quick check against [developers.notion.com](https://developers.notion.com) before relying on it in production.
