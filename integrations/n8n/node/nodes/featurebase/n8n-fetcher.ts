import type { IExecuteFunctions, IHookFunctions, IHttpRequestMethods, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
import type { Fetcher, FetchRequest, FetchResponse } from '@featurebase-connect-sdk/core';

// A union of all possible n8n execution contexts
export type N8nContext = IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions | IHookFunctions;

/**
 * Bridges the Core SDK's Fetcher interface onto n8n's own HTTP client, so proxy
 * settings and n8n's request logging keep working. Deliberately does NOT catch
 * n8n's thrown errors here: they propagate up through core's `withRetry`, whose
 * `shouldRetry`/`retryAfterMs` (from `featurebaseRetryOptions`) inspect the
 * error's `.response.status(Code)`/`.response.headers`, same shape n8n throws.
 */
export function createN8nFetcher(context: N8nContext): Fetcher {
	return async (request: FetchRequest): Promise<FetchResponse> => {
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
	};
}
