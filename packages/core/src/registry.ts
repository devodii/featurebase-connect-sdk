import type { ZodType } from 'zod';
import type { EndpointSpec, OperationId } from './types';

export type SchemaRegistry = {
	[TOp in OperationId]?: EndpointSpec<TOp>['body'] extends never ? never : ZodType<EndpointSpec<TOp>['body']>;
};

/** Type-checks a schema registry against the OpenAPI spec: a schema whose output doesn't match an operation's body won't compile. */
export function defineSchemas<T extends SchemaRegistry>(registry: T): T {
	return registry;
}
