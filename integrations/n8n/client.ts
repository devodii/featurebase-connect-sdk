import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: _$featurebaseconnect0.Fetcher;
}

export function createFeaturebaseClient(options: CreateClientOptions) {
	return _$featurebaseconnect0.createFeaturebase({
		apiKey: options.apiKey,
		baseUrl: options.baseUrl ?? 'https://do.featurebase.app',
		apiVersion: options.apiVersion,
		fetcher: options.fetcher ?? _$featurebaseconnect0.defaultFetcher,
		operations: _$featurebaseconnect0.operationRegistry,
		retry: _$featurebaseconnect0.featurebaseRetryOptions(),
		plugins: [_$featurebaseconnect0.applyFormatting(), _$featurebaseconnect0.applyValidation(_$featurebaseconnect0.generatedSchemas)],
	});
}
