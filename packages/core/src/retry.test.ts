import { withRetry } from './retry';

function fakeSleep(delays: number[]) {
	return async (ms: number) => {
		delays.push(ms);
	};
}

describe('withRetry', () => {
	it('returns the result on the first successful attempt without sleeping', async () => {
		const delays: number[] = [];
		const fn = jest.fn().mockResolvedValue('ok');

		const result = await withRetry(fn, { sleep: fakeSleep(delays) });

		expect(result).toBe('ok');
		expect(fn).toHaveBeenCalledTimes(1);
		expect(delays).toHaveLength(0);
	});

	it('retries only errors that shouldRetry approves, then rethrows the rest', async () => {
		const delays: number[] = [];
		const retryable = new Error('retryable');
		const fatal = new Error('fatal');
		const fn = jest.fn().mockRejectedValueOnce(retryable).mockRejectedValueOnce(fatal);

		await expect(
			withRetry(fn, {
				sleep: fakeSleep(delays),
				shouldRetry: (error) => error === retryable,
			}),
		).rejects.toBe(fatal);

		expect(fn).toHaveBeenCalledTimes(2);
	});

	it('gives up after maxRetries and throws the last error', async () => {
		const delays: number[] = [];
		const error = new Error('always fails');
		const fn = jest.fn().mockRejectedValue(error);

		await expect(
			withRetry(fn, {
				sleep: fakeSleep(delays),
				shouldRetry: () => true,
				maxRetries: 3,
			}),
		).rejects.toBe(error);

		expect(fn).toHaveBeenCalledTimes(4);
		expect(delays).toHaveLength(3);
	});

	it('backs off exponentially from baseDelayMs when no explicit retry-after is given', async () => {
		const delays: number[] = [];
		const error = new Error('rate limited');
		const fn = jest.fn().mockRejectedValue(error);

		await expect(
			withRetry(fn, {
				sleep: fakeSleep(delays),
				shouldRetry: () => true,
				maxRetries: 3,
				baseDelayMs: 100,
			}),
		).rejects.toBe(error);

		const [first, second, third] = delays;
		expect(first).toBeGreaterThanOrEqual(100);
		expect(first).toBeLessThan(125);
		expect(second).toBeGreaterThanOrEqual(200);
		expect(second).toBeLessThan(250);
		expect(third).toBeGreaterThanOrEqual(400);
		expect(third).toBeLessThan(500);
	});

	it('prefers an explicit retry-after delay over the computed backoff', async () => {
		const delays: number[] = [];
		const error = new Error('rate limited');
		const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

		const result = await withRetry(fn, {
			sleep: fakeSleep(delays),
			shouldRetry: () => true,
			retryAfterMs: () => 5000,
			baseDelayMs: 100,
		});

		expect(result).toBe('ok');
		expect(delays[0]).toBeGreaterThanOrEqual(5000);
		expect(delays[0]).toBeLessThan(6250);
	});
});
