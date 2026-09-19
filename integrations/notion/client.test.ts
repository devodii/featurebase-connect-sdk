import { FeaturebaseValidationError, type FetchRequest, type FetchResponse } from '@featurebase-connect-sdk/core';
import { createFeaturebaseClient } from './client';

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

describe('createFeaturebaseClient', () => {
	it('sends the api key as a bearer token', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await client.execute('listPosts');

		expect(requests[0].headers?.Authorization).toBe('Bearer sk_test');
		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts');
	});

	it('lists boards to map a board id to a name for the Notion sync', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({
			status: 200,
			headers: {},
			body: { data: [{ id: 'b1', name: 'Feature Requests' }], nextCursor: null },
		}));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		const result = await client.execute('listBoards');

		expect(requests[0]).toMatchObject({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });
		expect(result).toEqual({ data: [{ id: 'b1', name: 'Feature Requests' }], nextCursor: null });
	});

	it('creates a post from a new Notion database row, using the real schema and operation registry', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: { id: 'p1', title: 'hi', slug: 'hi' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		const result = await client.execute('createPost', { title: 'From Notion', boardId: 'b1' });

		expect(requests[0]).toMatchObject({ method: 'POST', url: 'https://do.featurebase.app/v2/posts' });
		expect(result).toEqual({ id: 'p1', title: 'hi', slug: 'hi' });
	});

	it('rejects an invalid payload against the real schema before sending', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: {} }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await expect(client.execute('createPost', { title: 'x', boardId: 'b1' })).rejects.toBeInstanceOf(FeaturebaseValidationError);
		expect(requests).toHaveLength(0);
	});

	it('resolves a required path param for getPost', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1', title: 'hi' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await client.execute('getPost', undefined, { pathParams: { id: 'p1' } });

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts/p1');
	});
});
