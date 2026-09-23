import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: _$featurebaseconnect0.Fetcher;
}

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
		operations: _$featurebaseconnect0.operationRegistry,
		retry: _$featurebaseconnect0.featurebaseRetryOptions(),
		plugins: [_$featurebaseconnect0.createFormattingPlugin(), _$featurebaseconnect0.createValidationPlugin(_$featurebaseconnect0.generatedSchemas)],
	});
}
