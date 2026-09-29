import type { IExecuteFunctions, IHookFunctions, IHttpRequestMethods, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
import type { Fetcher, FetchRequest, FetchResponse } from '@featurebase-connect-sdk/core';
import { extractErrorMessage } from '@featurebase-connect-sdk/core';

// A union of all possible n8n execution contexts
export type N8nContext = IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions | IHookFunctions;

/**
 * n8n's http-helper errors typically carry the upstream response body at
 * either `error.response.body` or `error.cause.response.body` (the latter
 * when n8n wraps the underlying request-library error). Same two spots the
 * old (deleted) generic-functions.ts checked.
 */
function extractUpstreamBody(error: unknown): unknown {
	const err = error as { response?: { body?: unknown }; cause?: { response?: { body?: unknown } } };
	return err.response?.body ?? err.cause?.response?.body;
}

/**
 * Bridges the Core SDK's Fetcher interface onto n8n's own HTTP client, so proxy
 * settings and n8n's request logging keep working. Deliberately does NOT swallow
 * n8n's thrown errors here: they still propagate up through core's `withRetry`,
 * whose `shouldRetry`/`retryAfterMs` (from `featurebaseRetryOptions`) inspect the
 * error's `.response.status(Code)`/`.response.headers`, same shape n8n throws.
 *
 * It does, however, improve the thrown error's `.message` using Featurebase's
 * actual response body (e.g. "Invalid API Key" instead of a generic n8n HTTP
 * error), by mutating the caught error in place and rethrowing the same object
 * so its shape - and anything n8n or retry detection reads off it - is preserved.
 */
export function createN8nFetcher(context: N8nContext): Fetcher {
	return async (request: FetchRequest): Promise<FetchResponse> => {
		try {
			const response = (await context.helpers.httpRequestWithAuthentication.call(context, 'featurebaseApi', {
				method: request.method as IHttpRequestMethods,
				url: request.url,
				headers: request.headers,
				body: request.body as Record<string, unknown> | undefined,
				json: true,
				returnFullResponse: true,
			})) as { statusCode: number; headers: Record<string, string>; body: unknown };

			return {
				status: response.statusCode,
				headers: response.headers,
				body: response.body,
			};
		} catch (error) {
			const message = extractErrorMessage(extractUpstreamBody(error));
			if (message && error instanceof Error) {
				error.message = message;
			}
			// Rethrow the same error object (not a NodeApiError) so its existing
			// shape - especially `.response.status`/`.response.headers`, which
			// `featurebaseRetryOptions` inspects for retry detection - is preserved.
			// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
			throw error;
		}
	};
}
