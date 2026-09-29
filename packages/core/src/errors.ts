/**
 * Extracts a human-readable message from a Featurebase API error response body.
 *
 * Checks, in order:
 * 1. `body.error.message` - the documented envelope shape (e.g. the 404
 *    `NotFoundError` shape: `{ error: { type, code, message, param } }`).
 * 2. `body.message` - a flat top-level string message. This covers two
 *    confirmed-but-undocumented real shapes that both happen to put the
 *    message here: the flat 400 validation shape
 *    (`{ code: 400, message: "Validation error: ..." }`) and the 401 auth
 *    failure shape (`{ success: false, message: "Invalid API Key" }`).
 *
 * Returns `undefined` if neither is a string, so callers can fall back to a
 * generic message.
 */
export function extractErrorMessage(body: unknown): string | undefined {
	const errorMessage = (body as { error?: { message?: unknown } } | undefined)?.error?.message;
	if (typeof errorMessage === 'string') return errorMessage;

	const flatMessage = (body as { message?: unknown } | undefined)?.message;
	if (typeof flatMessage === 'string') return flatMessage;

	return undefined;
}

/**
 * Thrown by `defaultFetcher` (see `client.ts`) whenever a Featurebase API
 * response has a status >= 400. Shapes `this.response` as
 * `{ status, headers, body }` because `featurebase-retry.ts`'s
 * `extractStatus`/`retryAfterMs` read exactly that shape off a thrown error
 * to detect and schedule 429 retries.
 */
export class FeaturebaseApiError extends Error {
	public readonly status: number;
	public readonly body: unknown;
	public readonly response: { status: number; headers: Record<string, string>; body: unknown };

	constructor(status: number, body: unknown, headers?: Record<string, string>) {
		super(extractErrorMessage(body) ?? `Featurebase API request failed with status ${status}`);
		this.name = 'FeaturebaseApiError';
		this.status = status;
		this.body = body;
		this.response = { status, headers: headers ?? {}, body };
	}
}
