jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	sleep: jest.fn().mockResolvedValue(undefined),
}));

import { sleep } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../nodes/Featurebase/GenericFunctions';

const mockNode = {
	id: '1',
	name: 'Featurebase',
	type: 'n8n-nodes-featurebase.featurebase',
	typeVersion: 1,
	position: [0, 0] as [number, number],
	parameters: {},
};

function createContext(httpRequestWithAuthentication: jest.Mock) {
	return {
		getNode: () => mockNode,
		getCredentials: jest.fn().mockResolvedValue({ baseUrl: 'https://do.featurebase.app', apiKey: 'sk_test', apiVersion: '2026-01-01.nova' }),
		helpers: { httpRequestWithAuthentication },
	};
}

function rateLimitError(retryAfterSeconds?: number) {
	return {
		response: {
			statusCode: 429,
			headers: retryAfterSeconds !== undefined ? { 'retry-after': String(retryAfterSeconds) } : {},
			body: { error: { type: 'rate_limit_error', code: 'rate_limit_error', message: 'Too many requests', status: 429 } },
		},
	};
}

function notFoundError() {
	return {
		response: {
			statusCode: 404,
			body: { error: { type: 'invalid_request_error', code: 'post_not_found', message: 'Post not found', param: 'id', status: 404 } },
		},
	};
}

describe('featurebaseApiRequest', () => {
	beforeEach(() => {
		(sleep as jest.Mock).mockClear();
	});

	it('sends the method, url, and query string', async () => {
		const httpRequestWithAuthentication = jest.fn().mockResolvedValue({ object: 'post', id: '1' });
		const context = createContext(httpRequestWithAuthentication);

		await featurebaseApiRequest.call(context as never, 'GET', '/v2/posts/1', {}, { limit: 5 });

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'featurebaseApi',
			expect.objectContaining({ method: 'GET', url: 'https://do.featurebase.app/v2/posts/1', qs: { limit: 5 } }),
		);
	});

	it('omits the body when empty', async () => {
		const httpRequestWithAuthentication = jest.fn().mockResolvedValue({});
		const context = createContext(httpRequestWithAuthentication);

		await featurebaseApiRequest.call(context as never, 'GET', '/v2/posts', {}, {});

		const options = httpRequestWithAuthentication.mock.calls[0][1];
		expect(options.body).toBeUndefined();
	});

	it('throws a NodeApiError with a readable message on a 404', async () => {
		const httpRequestWithAuthentication = jest.fn().mockRejectedValue(notFoundError());
		const context = createContext(httpRequestWithAuthentication);

		await expect(featurebaseApiRequest.call(context as never, 'GET', '/v2/posts/missing')).rejects.toThrow(
			'Featurebase post_not_found: Post not found (param: id)',
		);
	});

	it('retries on a 429 with exponential backoff, then succeeds', async () => {
		const httpRequestWithAuthentication = jest
			.fn()
			.mockRejectedValueOnce(rateLimitError())
			.mockRejectedValueOnce(rateLimitError())
			.mockResolvedValueOnce({ object: 'post', id: '1' });
		const context = createContext(httpRequestWithAuthentication);

		const result = await featurebaseApiRequest.call(context as never, 'GET', '/v2/posts/1');

		expect(result).toEqual({ object: 'post', id: '1' });
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenCalledTimes(2);
	});

	it('honours the Retry-After header when present', async () => {
		const httpRequestWithAuthentication = jest.fn().mockRejectedValueOnce(rateLimitError(2)).mockResolvedValueOnce({});
		const context = createContext(httpRequestWithAuthentication);

		await featurebaseApiRequest.call(context as never, 'GET', '/v2/posts/1');

		expect((sleep as jest.Mock).mock.calls[0][0]).toBeGreaterThanOrEqual(2000);
	});

	it('gives up after 5 rate-limit retries', async () => {
		const httpRequestWithAuthentication = jest.fn().mockRejectedValue(rateLimitError());
		const context = createContext(httpRequestWithAuthentication);

		await expect(featurebaseApiRequest.call(context as never, 'GET', '/v2/posts/1')).rejects.toThrow();
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(6);
	});
});

describe('featurebaseApiRequestAllItems', () => {
	it('follows nextCursor across pages when returnAll is true', async () => {
		const httpRequestWithAuthentication = jest
			.fn()
			.mockResolvedValueOnce({ data: [{ id: '1' }, { id: '2' }], nextCursor: 'cursor-2' })
			.mockResolvedValueOnce({ data: [{ id: '3' }], nextCursor: null });
		const context = createContext(httpRequestWithAuthentication);

		const items = await featurebaseApiRequestAllItems.call(context as never, '/v2/posts', {}, true);

		expect(items).toHaveLength(3);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('stops at the given limit when returnAll is false', async () => {
		const httpRequestWithAuthentication = jest.fn().mockResolvedValue({
			data: [{ id: '1' }, { id: '2' }, { id: '3' }],
			nextCursor: 'cursor-2',
		});
		const context = createContext(httpRequestWithAuthentication);

		const items = await featurebaseApiRequestAllItems.call(context as never, '/v2/posts', {}, false, 2);

		expect(items).toHaveLength(2);
	});
});
