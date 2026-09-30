import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createFeaturebaseClient } from './client';
import { createNotionClient } from './notion-client';
import { syncPostsToNotion } from './sync';

const propertyNames = {
	title: 'Title',
	status: 'Status',
	board: 'Board',
	upvotes: 'Upvotes',
	url: 'URL',
	featurebasePostId: 'Featurebase Post ID',
};

const app = new Hono();

app.get('/', (c) => c.json({ status: 'ok' }));

app.post('/sync', async (c) => {
	const featurebaseApiKey = process.env.FEATUREBASE_API_KEY;
	const notionApiKey = process.env.NOTION_API_KEY;
	const databaseId = process.env.NOTION_DATABASE_ID;

	if (!featurebaseApiKey || !notionApiKey || !databaseId) {
		return c.json({ error: 'Missing FEATUREBASE_API_KEY, NOTION_API_KEY, or NOTION_DATABASE_ID' }, 400);
	}

	const featurebase = createFeaturebaseClient({ apiKey: featurebaseApiKey });
	const notion = createNotionClient({ apiKey: notionApiKey });

	try {
		const result = await syncPostsToNotion({ featurebase, notion, databaseId, propertyNames });
		return c.json(result);
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : String(error) }, 502);
	}
});

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`Notion sync POC listening on http://localhost:${port}`);
