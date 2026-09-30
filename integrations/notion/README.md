# Featurebase → Notion sync

Mirrors Featurebase posts into a Notion database. Safe to re-run — creates a page for a post that doesn't have one yet, updates it otherwise.

## Setup

1. Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations), copy its secret.
2. Share your target database with that integration (`...` menu → Connections).
3. Add these properties to the database (names are yours to pick):
   - Title (the default one)
   - Select — post status
   - Select — board name
   - Number — upvotes
   - URL — post link
   - Text — Featurebase post id (dedupe key; don't reuse or hand-edit this one)
4. Copy the database id from its URL: `notion.so/<workspace>/<DATABASE_ID>?v=...`.

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

Call this on a schedule (cron, GitHub Actions, or an n8n Schedule Trigger node) — there's no built-in scheduler.

## Notes

- `propertyNames` maps your actual column names since every workspace names them differently.
- `NOTION_VERSION` in `notion-client.ts` and the exact rate-limit threshold are pinned to Notion's docs, not yet re-verified live.
