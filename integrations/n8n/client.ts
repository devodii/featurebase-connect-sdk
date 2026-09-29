import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: _$featurebaseconnect0.Fetcher;
}

// Re-exported for backwards compatibility with existing imports of this module;
// the implementation lives in core (`@featurebase-connect-sdk/core`'s
// `defaultFetcher`) so the throw-on-4xx/5xx fix only needs to live in one place.
export const defaultFetcher = _$featurebaseconnect0.defaultFetcher;

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
