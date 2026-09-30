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

/** A fetcher that resolves `db1` to a single data source `ds1`, then delegates everything else. */
function fakeFetcherWithDataSource(handler: (request: FetchRequest, attempt: number) => FetchResponse) {
	return fakeFetcher((request, attempt) => {
		if (request.method === 'GET' && request.url === 'https://api.notion.com/v1/databases/db1') {
			return { status: 200, headers: {}, body: { data_sources: [{ id: 'ds1', name: 'Tasks' }] } };
		}
		return handler(request, attempt);
	});
}

describe('NotionClient', () => {
	it('sends auth, api version, and content-type headers on every request', async () => {
		const { fetcher, requests } = fakeFetcherWithDataSource(() => ({ status: 200, headers: {}, body: { results: [] } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.queryDatabase('db1', { property: 'x', rich_text: { equals: 'y' } });

		expect(requests[0].headers).toMatchObject({
			Authorization: 'Bearer secret_test',
			'Notion-Version': '2025-09-03',
			'Content-Type': 'application/json',
		});
	});

	it('resolves the data source id before querying a database', async () => {
		const { fetcher, requests } = fakeFetcherWithDataSource(() => ({
			status: 200,
			headers: {},
			body: { results: [{ id: 'page1', properties: {} }] },
		}));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		const pages = await notion.queryDatabase('db1', { property: 'Featurebase Post ID', rich_text: { equals: 'p1' } });

		expect(requests[0]).toMatchObject({ method: 'GET', url: 'https://api.notion.com/v1/databases/db1' });
		expect(requests[1]).toMatchObject({
			method: 'POST',
			url: 'https://api.notion.com/v1/data_sources/ds1/query',
			body: { filter: { property: 'Featurebase Post ID', rich_text: { equals: 'p1' } } },
		});
		expect(pages).toEqual([{ id: 'page1', properties: {} }]);
	});

	it('caches the resolved data source id across multiple calls for the same database', async () => {
		const { fetcher, requests } = fakeFetcherWithDataSource(() => ({ status: 200, headers: {}, body: { results: [] } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.queryDatabase('db1', {});
		await notion.createPage('db1', {});

		const databaseLookups = requests.filter((r) => r.method === 'GET' && r.url === 'https://api.notion.com/v1/databases/db1');
		expect(databaseLookups).toHaveLength(1);
	});

	it('throws a clear error when a database has more than one data source', async () => {
		const { fetcher } = fakeFetcher(() => ({
			status: 200,
			headers: {},
			body: {
				data_sources: [
					{ id: 'ds1', name: 'Tasks' },
					{ id: 'ds2', name: 'Archive' },
				],
			},
		}));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await expect(notion.queryDatabase('db1', {})).rejects.toThrow(/2 data sources/);
	});

	it('creates a page under the given database, targeting its resolved data source id', async () => {
		const { fetcher, requests } = fakeFetcherWithDataSource(() => ({ status: 200, headers: {}, body: { id: 'page1', properties: {} } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await notion.createPage('db1', { Title: notionProperty.title('Add dark mode') });

		expect(requests[1]).toMatchObject({
			method: 'POST',
			url: 'https://api.notion.com/v1/pages',
			body: {
				parent: { type: 'data_source_id', data_source_id: 'ds1' },
				properties: { Title: { title: [{ text: { content: 'Add dark mode' } }] } },
			},
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
		const { fetcher, requests } = fakeFetcherWithDataSource((_request, attempt) => {
			if (attempt < 3) return { status: 429, headers: {}, body: { message: 'rate limited' } };
			return { status: 200, headers: {}, body: { results: [] } };
		});
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		const pages = await notion.queryDatabase('db1', {});

		expect(pages).toEqual([]);
		expect(requests).toHaveLength(3);
	});

	it('throws NotionApiError for a non-429 error response without retrying', async () => {
		const { fetcher, requests } = fakeFetcherWithDataSource(() => ({ status: 400, headers: {}, body: { message: 'invalid filter' } }));
		const notion = createNotionClient({ apiKey: 'secret_test', fetcher });

		await expect(notion.queryDatabase('db1', {})).rejects.toBeInstanceOf(NotionApiError);
		expect(requests).toHaveLength(2);
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
