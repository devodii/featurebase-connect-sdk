import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';
import { n8nOperations } from './operations';
import { createPostSchema, updatePostSchema } from './schemas';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: _$featurebaseconnect0.Fetcher;
}

const n8nSchemas = _$featurebaseconnect0.defineSchemas({
	createPost: { body: createPostSchema },
	updatePost: { body: updatePostSchema },
});

export const defaultFetcher: _$featurebaseconnect0.Fetcher = async (request) => {
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body === undefined ? undefined : JSON.stringify(request.body),
	});
	const body = await response.json().catch(() => undefined);
	return { status: response.status, headers: Object.fromEntries(response.headers), body };
};

export function createFeaturebaseClient(options: CreateClientOptions) {
	return _$featurebaseconnect0.createFeaturebase({
		apiKey: options.apiKey,
		baseUrl: options.baseUrl ?? 'https://do.featurebase.app',
		apiVersion: options.apiVersion,
		fetcher: options.fetcher ?? defaultFetcher,
		operations: n8nOperations,
		retry: _$featurebaseconnect0.featurebaseRetryOptions(),
		plugins: [_$featurebaseconnect0.createFormattingPlugin(), _$featurebaseconnect0.createValidationPlugin(n8nSchemas)],
	});
}
