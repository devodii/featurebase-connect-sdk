import type { FetchRequest, FetchResponse } from '@featurebase-connect-sdk/core';
import { createNotionClient, NotionApiError, notionProperty } from './notion-client';

function fakeFetcher(handler: (request: FetchRequest, attempt: number) => FetchResponse) {
	const requests: FetchRequest[] = [];
	let attempt = 0;
	return {
		requests,
		fetcher: async (request: FetchRequest) => {
			requests.push(request);
			attempt += 1;
			return handler(request, attempt);
		},
	};
}

describe('NotionClient', () => {
	it('sends auth, api version, and content-type headers on every request', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { results: [] } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.queryDatabase('db1', { property: 'x', rich_text: { equals: 'y' } });

		expect(requests[0].headers).toMatchObject({
			Authorization: 'Bearer secret_test',
			'Notion-Version': '2022-06-28',
			'Content-Type': 'application/json',
		});
	});

	it('queries a database with the given filter', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({
			status: 200,
			headers: {},
			body: { results: [{ id: 'page1', properties: {} }] },
		}));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		const pages = await notion.queryDatabase('db1', { property: 'Featurebase Post ID', rich_text: { equals: 'p1' } });

		expect(requests[0]).toMatchObject({
			method: 'POST',
			url: 'https://api.notion.com/v1/databases/db1/query',
			body: { filter: { property: 'Featurebase Post ID', rich_text: { equals: 'p1' } } },
		});
		expect(pages).toEqual([{ id: 'page1', properties: {} }]);
	});

	it('creates a page under the given database', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'page1', properties: {} } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.createPage('db1', { Title: notionProperty.title('Add dark mode') });

		expect(requests[0]).toMatchObject({
			method: 'POST',
			url: 'https://api.notion.com/v1/pages',
			body: { parent: { database_id: 'db1' }, properties: { Title: { title: [{ text: { content: 'Add dark mode' } }] } } },
		});
	});

	it('updates an existing page by id', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'page1', properties: {} } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.updatePage('page1', { Upvotes: notionProperty.number(42) });

		expect(requests[0]).toMatchObject({
			method: 'PATCH',
			url: 'https://api.notion.com/v1/pages/page1',
			body: { properties: { Upvotes: { number: 42 } } },
		});
	});

	it('retries a 429 and succeeds once the rate limit clears', async () => {
		const { fetcher, requests } = fakeFetcher((_request, attempt) => {
			if (attempt < 2) return { status: 429, headers: {}, body: { message: 'rate limited' } };
			return { status: 200, headers: {}, body: { results: [] } };
		});
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher: fetcher });

		const pages = await notion.queryDatabase('db1', {});

		expect(pages).toEqual([]);
		expect(requests).toHaveLength(2);
	});

	it('throws NotionApiError for a non-429 error response without retrying', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 400, headers: {}, body: { message: 'invalid filter' } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await expect(notion.queryDatabase('db1', {})).rejects.toBeInstanceOf(NotionApiError);
		expect(requests).toHaveLength(1);
	});
});

describe('notionProperty', () => {
	it('builds each property value in the shape the Notion API expects', () => {
		expect(notionProperty.title('hi')).toEqual({ title: [{ text: { content: 'hi' } }] });
		expect(notionProperty.richText('hi')).toEqual({ rich_text: [{ text: { content: 'hi' } }] });
		expect(notionProperty.number(5)).toEqual({ number: 5 });
		expect(notionProperty.url('https://x.test')).toEqual({ url: 'https://x.test' });
		expect(notionProperty.select('Open')).toEqual({ select: { name: 'Open' } });
	});
});
