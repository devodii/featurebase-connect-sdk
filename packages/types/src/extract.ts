import type { operations } from './generated/openapi';

export type OperationId = keyof operations;

type JsonContent<T> = T extends { content: { 'application/json': infer TBody } } ? TBody : never;

/** Request body type for an operationId, or `never` if it takes no body. */
export type ExtractBody<TOp extends OperationId> = 'requestBody' extends keyof operations[TOp]
	? JsonContent<NonNullable<operations[TOp]['requestBody']>>
	: never;

type SuccessResponses<T> = {
	[K in keyof T as `${K & (string | number)}` extends `2${string}` ? K : never]: T[K];
};

/** Success (2xx) response body type for an operationId. */
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
