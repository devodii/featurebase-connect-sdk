import type { ZodType } from 'zod';
import type { EndpointSpec, OperationId } from './types';

export type OperationSchemaDefinition<TOp extends OperationId> = {
	body?: EndpointSpec<TOp>['body'] extends never ? never : ZodType<EndpointSpec<TOp>['body']>;
	query?: EndpointSpec<TOp>['query'] extends never ? never : ZodType<EndpointSpec<TOp>['query']>;
	params?: EndpointSpec<TOp>['path'] extends never ? never : ZodType<EndpointSpec<TOp>['path']>;
};

export type SchemaRegistry = {
	[K in OperationId]?: OperationSchemaDefinition<K>;
};

export function defineSchemas<T extends SchemaRegistry>(registry: T): T {
	return registry;
}
