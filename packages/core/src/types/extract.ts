import type { operations } from '../generated/openapi';

export type OperationId = keyof operations;

type Operation<TOp extends OperationId> = operations[TOp];

type JsonContent<T> = T extends { content: { 'application/json': infer TBody } } ? TBody : never;

type SuccessStatus<TResponses> = {
	[K in keyof TResponses]: `${K & (string | number)}` extends `2${string}` ? K : never;
}[keyof TResponses];

type SuccessResponse<TOp extends OperationId> = JsonContent<Operation<TOp>['responses'][SuccessStatus<Operation<TOp>['responses']>]>;

/** Every shape derivable from an operationId: request body, query/path params, and the success response. */
export interface EndpointSpec<TOp extends OperationId> {
	body: JsonContent<NonNullable<Operation<TOp>['requestBody']>>;
	query: NonNullable<Operation<TOp>['parameters']['query']>;
	path: NonNullable<Operation<TOp>['parameters']['path']>;
	response: SuccessResponse<TOp>;
}
