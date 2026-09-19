import type { RetryOptions } from './retry';

interface ErrorLike {
	status?: number;
	statusCode?: number;
	response?: { status?: number; statusCode?: number; headers?: Record<string, string> };
}

function extractStatus(error: unknown): number | undefined {
	const err = error as ErrorLike;
	return err.response?.status ?? err.response?.statusCode ?? err.status ?? err.statusCode;
}

// @unchecked-rate-limit-status: Featurebase has not published which status codes
// signal rate limiting beyond the standard 429, which this assumes.
function isRateLimited(error: unknown): boolean {
	return extractStatus(error) === 429;
}

// @unchecked-retry-after-header: assumes a standard Retry-After header in seconds;
// Featurebase's exact rate-limit response shape is not documented.
function retryAfterMs(error: unknown): number | undefined {
	const err = error as ErrorLike;
	const header = err.response?.headers?.['retry-after'] ?? err.response?.headers?.['Retry-After'];
	if (!header) return undefined;

	const seconds = Number(header);
	return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

export function featurebaseRetryOptions(overrides: RetryOptions = {}): RetryOptions {
	return {
		maxRetries: 5,
		baseDelayMs: 500,
		shouldRetry: isRateLimited,
		retryAfterMs,
		...overrides,
	};
}
