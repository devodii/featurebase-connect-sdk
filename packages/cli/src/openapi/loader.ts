// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { JsonSchema } from './schema';

export interface OpenApiOperation {
	operationId: string;
	method: string;
	path: string;
	summary?: string;
	requestBodySchema?: JsonSchema;
	successResponseSchema?: JsonSchema;
}

export interface OpenApiDocument {
	raw: Record<string, unknown>;
	schemas: Record<string, JsonSchema>;
	operations: Record<string, OpenApiOperation>;
	webhookTopics: readonly string[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function resolveRef(document: Record<string, unknown>, ref: string): JsonSchema {
	const parts = ref.replace(/^#\//, '').split('/');
	let node: unknown = document;
	for (const part of parts) {
		node = (node as Record<string, unknown>)[part];
	}
	return node as JsonSchema;
}

/** Follows a single `$ref` one level; Featurebase's spec never nests refs inside refs at the schema root. */
export function dereference(document: Record<string, unknown>, schema: JsonSchema): JsonSchema {
	if (schema.$ref) return resolveRef(document, schema.$ref);
	return schema;
}

// Featurebase's spec has no top-level `webhooks` section; the real list of valid event
// topics only exists as an inline enum on CreateWebhookBody's `topics` array field.
function extractWebhookTopics(schemas: Record<string, JsonSchema>): readonly string[] {
	const topics = schemas.CreateWebhookBody?.properties?.topics?.items?.enum;
	if (!topics) {
		throw new Error('Could not find CreateWebhookBody.properties.topics.items.enum in the OpenAPI document');
	}
	return topics.map(String);
}

export function loadOpenApi(openapiPath: string): OpenApiDocument {
	const raw = JSON.parse(readFileSync(resolve(openapiPath), 'utf8')) as Record<string, unknown>;
	const schemas = ((raw.components as Record<string, unknown>)?.schemas ?? {}) as Record<string, JsonSchema>;
	const operations: Record<string, OpenApiOperation> = {};

	const paths = (raw.paths ?? {}) as Record<string, Record<string, unknown>>;
	for (const [path, methods] of Object.entries(paths)) {
		for (const method of HTTP_METHODS) {
			const op = methods[method] as Record<string, unknown> | undefined;
			if (!op?.operationId) continue;

			type MediaTypeObject = { content?: { 'application/json'?: { schema?: JsonSchema } } };
			const requestBody = op.requestBody as MediaTypeObject | undefined;
			const responses = (op.responses ?? {}) as Record<string, MediaTypeObject>;
			const successKey = Object.keys(responses).find((code) => code.startsWith('2'));

			const requestSchema = requestBody?.content?.['application/json']?.schema;
			const successSchema = successKey ? responses[successKey].content?.['application/json']?.schema : undefined;

			operations[op.operationId as string] = {
				operationId: op.operationId as string,
				method: method.toUpperCase(),
				path,
				summary: op.summary as string | undefined,
				requestBodySchema: requestSchema ? dereference(raw, requestSchema) : undefined,
				successResponseSchema: successSchema ? dereference(raw, successSchema) : undefined,
			};
		}
	}

	return { raw, schemas, operations, webhookTopics: extractWebhookTopics(schemas) };
}

export function getSchema(document: OpenApiDocument, name: string): JsonSchema {
	const schema = document.schemas[name];
	if (!schema) {
		throw new Error(`Schema "${name}" not found in the OpenAPI document`);
	}
	return schema;
}

export function getOperation(document: OpenApiDocument, operationId: string): OpenApiOperation {
	const operation = document.operations[operationId];
	if (!operation) {
		throw new Error(`Operation "${operationId}" not found in the OpenAPI document`);
	}
	return operation;
}
