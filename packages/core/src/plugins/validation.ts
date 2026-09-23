import type { ZodIssue } from 'zod';
import type { FeaturebasePlugin } from '../client';
import { FeaturebaseValidationError } from '../client';
import type { SchemaRegistry } from '../registry';
import type { OperationId } from '../types';

interface RequestOptions {
	body?: unknown;
	query?: unknown;
	params?: unknown;
}

/**
 * Automatically intercepts every `.execute()` call and validates the arguments
 * against the provided Schema Registry.
 */
export function createValidationPlugin(registry: SchemaRegistry): FeaturebasePlugin {
	return {
		id: 'featurebase-schema-validator',
		hooks: {
			beforeExecute(operation: OperationId, args: unknown[]) {
				const schema = registry[operation];
				if (!schema) return args; // No validation registered for this op, pass through

				const requestOptions = (args[0] ?? {}) as RequestOptions;
				const issues: { path: (string | number)[]; message: string }[] = [];

				// Validate Body
				if (schema.body && requestOptions.body) {
					const result = schema.body.safeParse(requestOptions.body);
					if (!result.success) {
						issues.push(...result.error.issues.map((i: ZodIssue) => ({ path: ['body', ...i.path], message: i.message })));
					} else {
						requestOptions.body = result.data;
					}
				}

				// Validate Query
				if (schema.query && requestOptions.query) {
					const result = schema.query.safeParse(requestOptions.query);
					if (!result.success) {
						issues.push(...result.error.issues.map((i: ZodIssue) => ({ path: ['query', ...i.path], message: i.message })));
					} else {
						requestOptions.query = result.data;
					}
				}

				// Validate Path Params
				if (schema.params && requestOptions.params) {
					const result = schema.params.safeParse(requestOptions.params);
					if (!result.success) {
						issues.push(...result.error.issues.map((i: ZodIssue) => ({ path: ['params', ...i.path], message: i.message })));
					} else {
						requestOptions.params = result.data;
					}
				}

				if (issues.length > 0) {
					throw new FeaturebaseValidationError(operation, issues);
				}

				return [requestOptions];
			},
		},
	};
}
