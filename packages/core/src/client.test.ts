import { createFeaturebase, defaultFetcher, FeaturebaseValidationError, type FeaturebasePlugin, type OperationRegistry } from './client';
import type { FetchRequest, FetchResponse, Fetcher } from './fetcher';
import { FeaturebaseApiError } from './errors';
import { featurebaseRetryOptions } from './featurebase-retry';

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

describe('createFeaturebase().execute', () => {
	it('calls an operation with no payload and no path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = createFeaturebase({ apiKey: 'sk_test', baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		const result = await client.execute('listBoards');

		expect(requests[0]).toMatchObject({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });
		expect(result).toEqual({ data: [], nextCursor: null });
	});

	it('substitutes required path params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { id: 'p1', title: 'hi' } }));
		const client = createFeaturebase({ apiKey: 'sk_test', baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('getPost', { params: { id: 'p1' } } as never);

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts/p1');
	});

	it('sends a request body', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 201, headers: {}, body: { id: 'p1', title: 'hi' } }));
		const client = createFeaturebase({ apiKey: 'sk_test', baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('createPost', { body: { title: 'hi', boardId: 'b1' } } as never);

		expect(requests[0]).toMatchObject({ method: 'POST', body: { title: 'hi', boardId: 'b1' } });
	});

	it('serializes query params', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { data: [], nextCursor: null } }));
		const client = createFeaturebase({ apiKey: 'sk_test', baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('listPosts', { query: { boardId: 'b1', sortBy: 'recent' } } as never);

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/posts?boardId=b1&sortBy=recent');
	});

	it('sends the api key as a bearer token and a default content-type', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));
		const client = createFeaturebase({ apiKey: 'sk_test', baseUrl: 'https://do.featurebase.app', fetcher, operations: OPERATIONS });

		await client.execute('listBoards');

		expect(requests[0].headers).toMatchObject({ Authorization: 'Bearer sk_test', 'Content-Type': 'application/json' });
	});

	it('sends the optional Featurebase-Version header only when configured', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));
		const client = createFeaturebase({
			apiKey: 'sk_test',
			baseUrl: 'https://do.featurebase.app',
			apiVersion: '2026-01-01.nova',
			fetcher,
			operations: OPERATIONS,
		});

		await client.execute('listBoards');

		expect(requests[0].headers?.['Featurebase-Version']).toBe('2026-01-01.nova');
	});

	it('defaults to the production base url when none is given', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));
		const client = createFeaturebase({ apiKey: 'sk_test', fetcher, operations: OPERATIONS });

		await client.execute('listBoards');

		expect(requests[0].url).toBe('https://do.featurebase.app/v2/boards');
	});

	it('throws a clear error when no descriptor is registered for an operation', async () => {
		const { fetcher } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));
		const client = createFeaturebase({ apiKey: 'sk_test', fetcher, operations: {} });

		await expect(client.execute('listBoards')).rejects.toThrow('listBoards');
	});

	it('retries a failed request using the configured retry policy', async () => {
		let calls = 0;
		const fetcher: Fetcher = async () => {
			calls += 1;
			if (calls < 3) throw new Error('rate limited');
			return { status: 200, headers: {}, body: { data: [], nextCursor: null } };
		};
		const client = createFeaturebase({
			apiKey: 'sk_test',
			fetcher,
			operations: OPERATIONS,
			retry: { maxRetries: 3, shouldRetry: () => true, sleep: async () => {} },
		});

		const result = await client.execute('listBoards');

		expect(calls).toBe(3);
		expect(result).toEqual({ data: [], nextCursor: null });
	});

	it('runs plugin hooks in order: beforeExecute, then beforeRequest, then afterResponse', async () => {
		const order: string[] = [];
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: { value: 'raw' } }));

		const plugin: FeaturebasePlugin = {
			id: 'tracker',
			hooks: {
				beforeExecute(_operation, args) {
					order.push('beforeExecute');
					return args;
				},
				beforeRequest(request) {
					order.push('beforeRequest');
					return { ...request, headers: { ...request.headers, 'X-Test': '1' } };
				},
				afterResponse(data) {
					order.push('afterResponse');
					return { ...(data as Record<string, unknown>), decorated: true };
				},
			},
		};

		const client = createFeaturebase({ apiKey: 'sk_test', fetcher, operations: OPERATIONS, plugins: [plugin] });
		const result = await client.execute('listBoards');

		expect(order).toEqual(['beforeExecute', 'beforeRequest', 'afterResponse']);
		expect(requests[0].headers?.['X-Test']).toBe('1');
		expect(result).toEqual({ value: 'raw', decorated: true });
	});

	it('lets a beforeExecute hook rewrite the arguments passed to the next hook and to the request', async () => {
		const { fetcher, requests } = fakeFetcher(() => ({ status: 200, headers: {}, body: {} }));

		const rewritePlugin: FeaturebasePlugin = {
			id: 'rewriter',
			hooks: {
				beforeExecute() {
					return [{ body: { title: 'rewritten' } }];
				},
			},
		};

		const client = createFeaturebase({ apiKey: 'sk_test', fetcher, operations: OPERATIONS, plugins: [rewritePlugin] });
		await client.execute('createPost', { body: { title: 'original' } } as never);

		expect(requests[0].body).toEqual({ title: 'rewritten' });
	});

	it('exposes registered plugins by id under $plugins', () => {
		const plugin: FeaturebasePlugin = { id: 'my-plugin' };
		const client = createFeaturebase({
			apiKey: 'sk_test',
			fetcher: async () => ({ status: 200, headers: {}, body: {} }),
			operations: OPERATIONS,
			plugins: [plugin],
		});

		expect(client.$plugins['my-plugin']).toBe(plugin);
	});
});

describe('defaultFetcher', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	function mockFetchOnce(status: number, body: unknown, headers: Record<string, string> = {}) {
		globalThis.fetch = jest.fn().mockResolvedValue({
			status,
			headers: new Headers(headers),
			json: async () => body,
		}) as unknown as typeof fetch;
	}

	it('returns the parsed response for a successful request', async () => {
		mockFetchOnce(200, { data: [], nextCursor: null });

		const result = await defaultFetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });

		expect(result).toEqual({ status: 200, headers: {}, body: { data: [], nextCursor: null } });
	});

	it('throws a FeaturebaseApiError, instead of returning normally, for a 4xx/5xx response', async () => {
		mockFetchOnce(404, { error: { type: 'invalid_request_error', code: 'resource_not_found', message: 'Post not found', param: 'post' } });

		await expect(defaultFetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/posts/bad-id' })).rejects.toMatchObject({
			name: 'FeaturebaseApiError',
			status: 404,
			message: 'Post not found',
		});
	});

	// Regression test for the dead-retry bug: previously `defaultFetcher` returned
	// a response object no matter the status, so `withRetry` (which only retries
	// inside a `catch`) never saw a 429 as retryable. This must actually retry.
	it('actually triggers a retry via withRetry + featurebaseRetryOptions on a 429', async () => {
		let calls = 0;
		globalThis.fetch = jest.fn().mockImplementation(async () => {
			calls += 1;
			if (calls < 3) {
				return {
					status: 429,
					headers: new Headers({ 'retry-after': '0' }),
					json: async () => ({ success: false, message: 'Too many requests' }),
				};
			}
			return { status: 200, headers: new Headers(), json: async () => ({ data: [], nextCursor: null }) };
		}) as unknown as typeof fetch;

		const client = createFeaturebase({
			apiKey: 'sk_test',
			fetcher: defaultFetcher,
			operations: OPERATIONS,
			retry: featurebaseRetryOptions({ sleep: async () => {} }),
		});

		const result = await client.execute('listBoards');

		expect(calls).toBe(3);
		expect(result).toEqual({ data: [], nextCursor: null });
	});

	it('does not retry a non-retryable 4xx and rejects with FeaturebaseApiError', async () => {
		mockFetchOnce(401, { success: false, message: 'Invalid API Key' });

		const client = createFeaturebase({
			apiKey: 'sk_test',
			fetcher: defaultFetcher,
			operations: OPERATIONS,
			retry: featurebaseRetryOptions({ sleep: async () => {} }),
		});

		await expect(client.execute('listBoards')).rejects.toBeInstanceOf(FeaturebaseApiError);
	});
});

describe('FeaturebaseValidationError', () => {
	it('formats a readable message from the given issues', () => {
		const error = new FeaturebaseValidationError('createPost', [{ path: ['body', 'title'], message: 'Required' }]);

		expect(error.name).toBe('FeaturebaseValidationError');
		expect(error.operation).toBe('createPost');
		expect(error.message).toBe('Validation failed for "createPost": body.title Required');
	});
});
