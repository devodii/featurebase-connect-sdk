import type { operations } from './generated/openapi';

export type OperationId = keyof operations;

type JsonContent<T> = T extends { content: { 'application/json': infer TBody } } ? TBody : never;

/**
 * The request body type for a given operationId, or never if that operation
 * takes no body (a GET, or a DELETE with no payload).
 */
export type ExtractBody<TOp extends OperationId> = 'requestBody' extends keyof operations[TOp]
	? JsonContent<NonNullable<operations[TOp]['requestBody']>>
	: never;

type SuccessResponses<T> = {
	[K in keyof T as `${K & (string | number)}` extends `2${string}` ? K : never]: T[K];
};

/**
 * The success response body type for a given operationId. Featurebase uses
 * 200, 201, and 204 across different operations, so this unions whichever
 * 2xx response codes that operation declares.
 */
export type ExtractResponse<TOp extends OperationId> = JsonContent<
	SuccessResponses<operations[TOp]['responses']>[keyof SuccessResponses<operations[TOp]['responses']>]
>;

export type OperationQuery<TOp extends OperationId> = operations[TOp] extends {
	parameters: { query?: infer TQuery };
}
	? TQuery
	: never;

export type OperationPath<TOp extends OperationId> = operations[TOp] extends {
	parameters: { path?: infer TPath };
}
	? TPath
	: never;
