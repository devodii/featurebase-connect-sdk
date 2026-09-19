// This is the sdk's own n8n adapter, not the published n8n node, so a real dependency is fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { FeaturebaseClient, featurebaseRetryOptions, type Fetcher } from '@featurebase-connect-sdk/core';
import { n8nOperations } from './generated/operations';
import { n8nSchemas } from './generated/schemas';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: Fetcher;
}

export const defaultFetcher: Fetcher = async (request) => {
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body === undefined ? undefined : JSON.stringify(request.body),
	});
	const body = await response.json().catch(() => undefined);
	return { status: response.status, headers: Object.fromEntries(response.headers), body };
};

export function createFeaturebaseClient(options: CreateClientOptions): FeaturebaseClient {
	return new FeaturebaseClient({
		baseUrl: options.baseUrl ?? 'https://do.featurebase.app',
		fetcher: options.fetcher ?? defaultFetcher,
		operations: n8nOperations,
		schemas: n8nSchemas,
		retry: featurebaseRetryOptions(),
		headers: {
			Authorization: `Bearer ${options.apiKey}`,
			...(options.apiVersion ? { 'Featurebase-Version': options.apiVersion } : {}),
		},
	});
}
