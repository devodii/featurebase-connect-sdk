import type { Equal, Expect } from './types';
import { z } from 'zod';
import { FeaturebaseClient, FeaturebaseValidationError, type ExecuteArgs, type OperationRegistry } from './client';
import type { FetchRequest, FetchResponse, Fetcher } from './fetcher';

const OPERATIONS: OperationRegistry = {
	listBoards: { method: 'GET', path: '/v2/boards' },
	listPosts: { method: 'GET', path: '/v2/posts' },
	getPost: { method: 'GET', path: '/v2/posts/{id}' },
	createPost: { method: 'POST', path: '/v2/posts' },
	updatePost: { method: 'PATCH', path: '/v2/posts/{id}' },
};

function fakeFetcher(handler: (request: FetchRequest) => FetchResponse) {
	const requests: FetchRequest[] = [];
	const fetcher: Fetcher = async (request) => {
		requests.push(request);
		return handler(request);
	};
	return { fetcher, requests };
}

describe('FeaturebaseClient.execute', () => {
	it('calls an operation with no payload and no path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		const result = await client.execute('listBoards');

		expect(requests[0]).toMatchObject({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });
		expect(result).toEqual({ data: [], nextCursor: null });
	});

	it('substitutes required path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1', title: 'hi' } }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('getPost', undefined, { pathParams: { id: 'p1' } });

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts/p1');
	});

	it('sends a required body with no path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: { id: 'p1', title: 'hi', slug: 'hi' } }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('createPost', { title: 'hi', boardId: 'b1' });

		expect(requests[0]).toMatchObject({ method: 'POST', body: { title: 'hi', boardId: 'b1' } });
	});

	it('sends a required body together with required path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1', title: 'updated' } }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('updatePost', { title: 'updated' }, { pathParams: { id: 'p1' } });

		expect(requests[0]).toMatchObject({ method: 'PATCH', url: 'https://do.featurebase.app/v2/posts/p1', body: { title: 'updated' } });
	});

	it('serializes query params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('listPosts', undefined, { query: { boardId: 'b1', sortBy: 'recent' } });

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts?boardId=b1&sortBy=recent');
	});

	it('validates the payload against a zod schema before sending, and never calls the fetcher on failure', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: {} }));
		const schema = z.object({ title: z.string().min(2), boardId: z.string() });
		const client = new FeaturebaseClient({
			baseUrl: 'https://do.featurebase.app',
			fetcher,
			operations: OPERATIONS,
			schemas: { createPost: schema },
		});

		await expect(client.execute('createPost', { title: 't', boardId: 'b1' })).rejects.toBeInstanceOf(FeaturebaseValidationError);
		expect(requests).toHaveLength(0);
	});

	it('retries a failed request using the configured retry policy', async () => {
		let calls = 0;
		const fetcher: Fetcher = async () => {
			calls += 1;
			if (calls < 3) throw new Error('rate limited');
			return { status: 200, headers: {}, body: { data: [], nextCursor: null } };
		};
		const client = new FeaturebaseClient({
			baseUrl: 'https://do.featurebase.app',
			fetcher,
			operations: OPERATIONS,
			retry: { maxRetries: 3, shouldRetry: () => true, sleep: async () => {} },
		});

		const result = await client.execute('listBoards');

		expect(calls).toBe(3);
		expect(result).toEqual({ data: [], nextCursor: null });
	});

	it('throws a clear error when no descriptor is registered for an operation', async () => {
		const { fetcher } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));
		const client = new FeaturebaseClient({ baseUrl: 'https://do.featurebase.app', fetcher, operations: {} });

		await expect(client.execute('listBoards')).rejects.toThrow('listBoards');
	});
});

describe('ExecuteArgs', () => {
	it('requires nothing for an operation with no body and no path params', () => {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		type _NoPayloadNoPath = Expect<Equal<ExecuteArgs<'listBoards'>, [payload?: undefined, options?: { query?: never }]>>;
		expect(true).toBe(true);
	});
});
