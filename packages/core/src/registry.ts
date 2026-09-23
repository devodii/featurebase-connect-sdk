import type { ZodType } from 'zod';
import type { EndpointSpec, OperationId } from './types';

/**
 * The God-Tier Registry.
 * If you try to register a Zod schema here that doesn't EXACTLY match
 * the OpenAPI spec for that operation, TypeScript will throw a compilation error.
 */
export type OperationSchemaDefinition<TOp extends OperationId> = {
	body?: EndpointSpec<TOp>['body'] extends never ? never : ZodType<EndpointSpec<TOp>['body']>;
	query?: EndpointSpec<TOp>['query'] extends never ? never : ZodType<EndpointSpec<TOp>['query']>;
	params?: EndpointSpec<TOp>['path'] extends never ? never : ZodType<EndpointSpec<TOp>['path']>;
};

export type SchemaRegistry = {
	[K in OperationId]?: OperationSchemaDefinition<K>;
};

/**
 * A helper to build a type-safe registry.
 * Usage:
 * const schemas = defineSchemas({
 *   createPost: {
 *     body: z.object({ title: z.string(), boardId: z.string() }) // TS enforces this!
 *   }
 * })
 */
export function defineSchemas<T extends SchemaRegistry>(registry: T): T {
	return registry;
}
