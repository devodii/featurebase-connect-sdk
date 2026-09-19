// This is the sdk's own n8n adapter, not the published n8n node, so a real dependency
// is fine; the root lint job runs npm ci (no pnpm workspace linking), so it cannot
// resolve this workspace package either.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, import-x/no-unresolved */
import { defineHooks, FeaturebaseClient, featurebaseRetryOptions, type Fetcher } from '@featurebase-connect-sdk/core';
import type { ZodTypeAny } from 'zod';
import { n8nOperations } from './operations';
import { createPostSchema, updatePostSchema } from './schemas';

export interface CreateClientOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: Fetcher;
}

const n8nSchemas: Record<string, ZodTypeAny> = {
	createPost: createPostSchema,
	updatePost: updatePostSchema,
};

// Trims stray whitespace from a title before it's validated and sent, since n8n users
// often copy titles in from another field or a spreadsheet column.
const n8nHooks = defineHooks({
	createPost: [(ctx) => ({ ...ctx.payload, title: ctx.payload.title.trim() })],
	updatePost: [(ctx) => (ctx.payload.title === undefined ? ctx.payload : { ...ctx.payload, title: ctx.payload.title.trim() })],
});

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
		hooks: n8nHooks,
		retry: featurebaseRetryOptions(),
		headers: {
			Authorization: `Bearer ${options.apiKey}`,
			...(options.apiVersion ? { 'Featurebase-Version': options.apiVersion } : {}),
		},
	});
}
