import type { N8nContext } from './n8n-fetcher';
import { createN8nFetcher } from './n8n-fetcher';

function makeContext(httpRequestWithAuthentication: jest.Mock): N8nContext {
	return {
		helpers: { httpRequestWithAuthentication },
	} as unknown as N8nContext;
}

describe('createN8nFetcher', () => {
	it('returns status/headers/body on success', async () => {
		const call = jest.fn().mockResolvedValue({ statusCode: 200, headers: { 'x-req': '1' }, body: { data: [] } });
		const fetcher = createN8nFetcher(makeContext(call));

		const result = await fetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });

		expect(result).toEqual({ status: 200, headers: { 'x-req': '1' }, body: { data: [] } });
	});

	it('rethrows the same error object, preserving its shape, on failure', async () => {
		const original = Object.assign(new Error('generic n8n http error'), {
			response: { status: 401, headers: {}, body: { success: false, message: 'Invalid API Key' } },
		});
		const call = jest.fn().mockRejectedValue(original);
		const fetcher = createN8nFetcher(makeContext(call));

		let caught: unknown;
		try {
			await fetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' });
		} catch (error) {
			caught = error;
		}

		expect(caught).toBe(original);
		expect((caught as { response: unknown }).response).toBe(original.response);
	});

	it('overrides the error message using the response body at error.response.body', async () => {
		const original = Object.assign(new Error('generic n8n http error'), {
			response: { status: 401, body: { success: false, message: 'Invalid API Key' } },
		});
		const call = jest.fn().mockRejectedValue(original);
		const fetcher = createN8nFetcher(makeContext(call));

		await expect(fetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' })).rejects.toThrow('Invalid API Key');
	});

	it('overrides the error message using the response body at error.cause.response.body', async () => {
		const original = Object.assign(new Error('generic n8n http error'), {
			cause: { response: { body: { code: 400, message: 'Validation error: body.title: String must contain at least 2 character(s)' } } },
		});
		const call = jest.fn().mockRejectedValue(original);
		const fetcher = createN8nFetcher(makeContext(call));

		await expect(fetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' })).rejects.toThrow(
			'Validation error: body.title: String must contain at least 2 character(s)',
		);
	});

	it('leaves the message unchanged when no known body shape is found', async () => {
		const original = Object.assign(new Error('generic n8n http error'), { response: { body: { nothing: 'useful' } } });
		const call = jest.fn().mockRejectedValue(original);
		const fetcher = createN8nFetcher(makeContext(call));

		await expect(fetcher({ method: 'GET', url: 'https://do.featurebase.app/v2/boards' })).rejects.toThrow('generic n8n http error');
	});
});
