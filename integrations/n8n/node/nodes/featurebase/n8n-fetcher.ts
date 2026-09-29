import type { IExecuteFunctions, IHookFunctions, IHttpRequestMethods, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';
import type { Fetcher, FetchRequest, FetchResponse } from '@featurebase-connect-sdk/core';
import { extractErrorMessage } from '@featurebase-connect-sdk/core';

export type N8nContext = IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions | IHookFunctions;

function extractUpstreamBody(error: unknown): unknown {
	const err = error as { response?: { body?: unknown }; cause?: { response?: { body?: unknown } } };
	return err.response?.body ?? err.cause?.response?.body;
}

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
			// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
			throw error;
		}
	};
}
