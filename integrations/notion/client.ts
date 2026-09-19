import { FeaturebaseClient, featurebaseRetryOptions, type Fetcher } from '@featurebase-connect-sdk/core';
import type { ZodTypeAny } from 'zod';
import { notionOperations } from './operations';
import { createPostSchema } from './schemas';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: Fetcher;
}

const notionSchemas: Record<string, ZodTypeAny> = {
	createPost: createPostSchema,
};

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
		operations: notionOperations,
		schemas: notionSchemas,
		retry: featurebaseRetryOptions(),
		headers: {
			Authorization: `Bearer ${options.apiKey}`,
			...(options.apiVersion ? { 'Featurebase-Version': options.apiVersion } : {}),
		},
	});
}
