// This is a platform-agnostic package, not n8n node code, so a plain setTimeout
// and rethrowing the caller's own error (for it to wrap however it wants) are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/require-node-api-error */

export interface RetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	shouldRetry?: (error: unknown, attempt: number) => boolean;
	retryAfterMs?: (error: unknown) => number | undefined;
	sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const { maxRetries = 5, baseDelayMs = 500, shouldRetry = () => false, retryAfterMs, sleep = defaultSleep } = options;

	let attempt = 0;
	while (true) {
		try {
			return await fn();
		} catch (error) {
			if (attempt >= maxRetries || !shouldRetry(error, attempt)) throw error;

			attempt += 1;
			const explicitDelay = retryAfterMs?.(error);
			const backoff = explicitDelay ?? baseDelayMs * 2 ** (attempt - 1);
			const jitter = Math.random() * backoff * 0.25;
			await sleep(backoff + jitter);
		}
	}
}
