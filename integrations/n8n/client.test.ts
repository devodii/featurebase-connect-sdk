// This is the sdk's own n8n adapter, not the published n8n node, so a real dependency
// is fine; the root lint job runs npm ci (no pnpm workspace linking), so it cannot
// resolve this workspace package either.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, import-x/no-unresolved */
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

	it('sends the optional api version header only when provided', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', apiVersion: '2026-01-01.nova', fetcher });

		await client.execute('listPosts');

		expect(requests[0].headers?.['Featurebase-Version']).toBe('2026-01-01.nova');
	});

	it('creates a post using the real schema and operation registry', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: { id: 'p1', title: 'hi', slug: 'hi' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		const result = await client.execute('createPost', { title: 'A real post', boardId: 'b1' });

		expect(requests[0]).toMatchObject({ method: 'POST', url: 'https://do.featurebase.app/v2/posts' });
		expect(result).toEqual({ id: 'p1', title: 'hi', slug: 'hi' });
	});

	it('rejects an invalid payload against the real schema before sending', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: {} }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await expect(client.execute('createPost', { title: 'x', boardId: 'b1' })).rejects.toBeInstanceOf(FeaturebaseValidationError);
		expect(requests).toHaveLength(0);
	});

	it('trims a padded title via the before-request hook before it is validated and sent', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: { id: 'p1', title: 'hi', slug: 'hi' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await client.execute('createPost', { title: '  A real post  ', boardId: 'b1' });

		expect(requests[0]).toMatchObject({ body: { title: 'A real post' } });
	});

	it('leaves an update payload with no title untouched by the hook', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await client.execute('updatePost', { boardId: 'b2' }, { pathParams: { id: 'p1' } });

		expect(requests[0]).toMatchObject({ body: { boardId: 'b2' } });
	});

	it('resolves a required path param for getPost', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1', title: 'hi' } }));
		const client = createFeaturebaseClient({ apiKey: 'sk_test', fetcher });

		await client.execute('getPost', undefined, { pathParams: { id: 'p1' } });

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts/p1');
	});
});
