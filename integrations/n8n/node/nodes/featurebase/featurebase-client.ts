import { createFeaturebase, createFormattingPlugin, createValidationPlugin, operationRegistry, generatedSchemas } from '@featurebase-connect-sdk/core';

import { createN8nFetcher, type N8nContext } from './n8n-fetcher';

export async function getFeaturebaseClient(context: N8nContext) {
	const credentials = await context.getCredentials('featurebaseApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://do.featurebase.app';
	const apiVersion = credentials.apiVersion as string | undefined;

	return createFeaturebase({
		apiKey: credentials.apiKey as string,
		baseUrl,
		apiVersion,
		operations: operationRegistry,
		fetcher: createN8nFetcher(context),
		plugins: [createFormattingPlugin(), createValidationPlugin(generatedSchemas)],
	});
}
