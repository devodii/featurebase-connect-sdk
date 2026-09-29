import { featurebaseRetryOptions } from './featurebase-retry';
import { withRetry } from './retry';

function rateLimitError(headers: Record<string, string> = {}) {
	return { response: { status: 429, headers } };
}

describe('featurebaseRetryOptions', () => {
	it('retries a 429 and gives up on any other status', async () => {
		const options = featurebaseRetryOptions({ sleep: async () => {} });

		const rateLimited = jest.fn().mockRejectedValueOnce(rateLimitError()).mockResolvedValueOnce('ok');
		await expect(withRetry(rateLimited, options)).resolves.toBe('ok');
		expect(rateLimited).toHaveBeenCalledTimes(2);

		const notFound = jest.fn().mockRejectedValue({ response: { status: 404 } });
		await expect(withRetry(notFound, options)).rejects.toEqual({ response: { status: 404 } });
		expect(notFound).toHaveBeenCalledTimes(1);
	});

	it('detects a 429 from a bare status field, not just a nested response', async () => {
		const options = featurebaseRetryOptions({ sleep: async () => {} });
		const fn = jest.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValueOnce('ok');

		await expect(withRetry(fn, options)).resolves.toBe('ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('detects a 429 from a statusCode field', async () => {
		const options = featurebaseRetryOptions({ sleep: async () => {} });
		const fn = jest
			.fn()
			.mockRejectedValueOnce({ response: { statusCode: 429 } })
			.mockResolvedValueOnce('ok');

		await expect(withRetry(fn, options)).resolves.toBe('ok');
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('honors a Retry-After header in seconds', async () => {
		const delays: number[] = [];
		const options = featurebaseRetryOptions({ sleep: async (ms) => void delays.push(ms) });

		const fn = jest
			.fn()
			.mockRejectedValueOnce(rateLimitError({ 'retry-after': '2' }))
			.mockResolvedValueOnce('ok');
		await withRetry(fn, options);

		expect(delays[0]).toBeGreaterThanOrEqual(2000);
		expect(delays[0]).toBeLessThan(2500);
	});

	it('reads a capitalized Retry-After header too', async () => {
		const delays: number[] = [];
		const options = featurebaseRetryOptions({ sleep: async (ms) => void delays.push(ms) });

		const fn = jest
			.fn()
			.mockRejectedValueOnce(rateLimitError({ 'Retry-After': '1' }))
			.mockResolvedValueOnce('ok');
		await withRetry(fn, options);

		expect(delays[0]).toBeGreaterThanOrEqual(1000);
		expect(delays[0]).toBeLessThan(1250);
	});

	it('falls back to exponential backoff when there is no Retry-After header', async () => {
		const delays: number[] = [];
		const options = featurebaseRetryOptions({ sleep: async (ms) => void delays.push(ms) });

		const fn = jest.fn().mockRejectedValueOnce(rateLimitError()).mockResolvedValueOnce('ok');
		await withRetry(fn, options);

		expect(delays[0]).toBeGreaterThanOrEqual(500);
		expect(delays[0]).toBeLessThan(625);
	});

	it('lets a caller override the defaults', async () => {
		const options = featurebaseRetryOptions({ maxRetries: 1, sleep: async () => {} });
		const fn = jest.fn().mockRejectedValue(rateLimitError());

		await expect(withRetry(fn, options)).rejects.toBeDefined();
		expect(fn).toHaveBeenCalledTimes(2);
	});
});
