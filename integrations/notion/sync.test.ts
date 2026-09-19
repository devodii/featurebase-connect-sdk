import type { FetchRequest, FetchResponse } from '@featurebase-connect-sdk/core';
import { createFeaturebaseClient } from './client';
import { createNotionClient } from './notion-client';
import { syncPostsToNotion, type NotionPropertyNames } from './sync';

function fakeFetcher(handler: (request: FetchRequest) => FetchResponse) {
	const requests: FetchRequest[] = [];
	return {
		requests,
		fetcher: async (request: FetchRequest) => {
			requests.push(request);
			return handler(request);
		},
	};
}

const propertyNames: NotionPropertyNames = {
	title: 'Title',
	status: 'Status',
	board: 'Board',
	upvotes: 'Upvotes',
	url: 'URL',
	featurebasePostId: 'Featurebase Post ID',
};

const posts = [
	{
		id: 'p1',
		title: 'Add dark mode',
		boardId: 'b1',
		status: { name: 'In Progress' },
		upvotes: 42,
		postUrl: 'https://fb.example.com/p/add-dark-mode',
	},
	{
		id: 'p2',
		title: 'Export to CSV',
		boardId: 'b1',
		status: { name: 'Open' },
		upvotes: 10,
		postUrl: 'https://fb.example.com/p/export-to-csv',
	},
];

function featurebaseFetcher() {
	return fakeFetcher((request) => {
		if (request.url.startsWith('https://do.featurebase.app/v2/boards')) {
			return { status: 200, headers: {}, body: [{ id: 'b1', name: 'Feature Requests' }] };
		}
		if (request.url.startsWith('https://do.featurebase.app/v2/posts')) {
			return { status: 200, headers: {}, body: { data: posts, nextCursor: null } };
		}
		throw new Error(`Unexpected Featurebase request: ${request.url}`);
	});
}

function notionFetcher() {
	return fakeFetcher((request) => {
		if (request.method === 'POST' && request.url.endsWith('/query')) {
			const body = request.body as { filter: { rich_text: { equals: string } } };
			// p1 has no existing page yet (create); p2 is already synced (update).
			const existing = body.filter.rich_text.equals === 'p2' ? [{ id: 'notion-page-2', properties: {} }] : [];
			return { status: 200, headers: {}, body: { results: existing } };
		}
		if (request.method === 'POST' && request.url.endsWith('/pages')) {
			return { status: 200, headers: {}, body: { id: 'notion-page-1', properties: {} } };
		}
		if (request.method === 'PATCH') {
			return { status: 200, headers: {}, body: { id: 'notion-page-2', properties: {} } };
		}
		throw new Error(`Unexpected Notion request: ${request.method} ${request.url}`);
	});
}

describe('syncPostsToNotion', () => {
	it('creates a page for a post with no existing match, and updates the page for one that already exists', async () => {
		const fb = featurebaseFetcher();
		const notionApi = notionFetcher();

		const featurebase = createFeaturebaseClient({ apiKey: 'sk_test', fetcher: fb.fetcher });
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher: notionApi.fetcher });

		const result = await syncPostsToNotion({ featurebase, notion, databaseId: 'db1', propertyNames });

		expect(result).toEqual({ created: 1, updated: 1 });

		const createRequest = notionApi.requests.find((r) => r.method === 'POST' && r.url.endsWith('/pages'));
		expect(createRequest?.body).toMatchObject({
			parent: { database_id: 'db1' },
			properties: {
				Title: { title: [{ text: { content: 'Add dark mode' } }] },
				Status: { select: { name: 'In Progress' } },
				Board: { select: { name: 'Feature Requests' } },
				Upvotes: { number: 42 },
				URL: { url: 'https://fb.example.com/p/add-dark-mode' },
				'Featurebase Post ID': { rich_text: [{ text: { content: 'p1' } }] },
			},
		});

		const updateRequest = notionApi.requests.find((r) => r.method === 'PATCH');
		expect(updateRequest?.url).toBe('https://api.notion.com/v1/pages/notion-page-2');
		expect(updateRequest?.body).toMatchObject({
			properties: { Title: { title: [{ text: { content: 'Export to CSV' } }] } },
		});
	});

	it('falls back to the raw board id when a board has no matching name', async () => {
		const fb = fakeFetcher((request) => {
			if (request.url.includes('/boards')) return { status: 200, headers: {}, body: [] };
			return { status: 200, headers: {}, body: { data: [posts[0]], nextCursor: null } };
		});
		const notionApi = notionFetcher();

		const featurebase = createFeaturebaseClient({ apiKey: 'sk_test', fetcher: fb.fetcher });
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher: notionApi.fetcher });

		await syncPostsToNotion({ featurebase, notion, databaseId: 'db1', propertyNames });

		const createRequest = notionApi.requests.find((r) => r.method === 'POST' && r.url.endsWith('/pages'));
		expect(createRequest?.body).toMatchObject({ properties: { Board: { select: { name: 'b1' } } } });
	});
});
