import type { operations } from '../generated/openapi';

export type OperationId = keyof operations;

// Helper to extract JSON content safely
type JsonPayload<T> = T extends { content: { 'application/json': infer U } } ? U : never;

// Ensure we only extract 2xx success responses (status keys are numeric literals, so coerce to string to pattern-match)
type SuccessResponse<T> = {
	[K in keyof T as `${K & (string | number)}` extends `2${string}` ? K : never]: T[K];
};

/**
 * The Ultimate Endpoint Resolver.
 * Maps any OpenAPI OperationId to its exact Body, Query, Path, and Response types.
 */
export type EndpointSpec<T extends OperationId> = {
	body: 'requestBody' extends keyof operations[T] ? JsonPayload<NonNullable<operations[T]['requestBody']>> : never;
	query: 'parameters' extends keyof operations[T]
		? 'query' extends keyof NonNullable<operations[T]['parameters']>
			? NonNullable<NonNullable<operations[T]['parameters']>['query']>
			: never
		: never;
	path: 'parameters' extends keyof operations[T]
		? 'path' extends keyof NonNullable<operations[T]['parameters']>
			? NonNullable<NonNullable<operations[T]['parameters']>['path']>
			: never
		: never;
	response: 'responses' extends keyof operations[T]
		? JsonPayload<SuccessResponse<operations[T]['responses']>[keyof SuccessResponse<operations[T]['responses']>]>
		: never;
};

/**
 * Creates a deeply inferred arguments object.
 * If an endpoint doesn't require a body, query, or path params, they are omitted from the type signature.
 * If they are required, TypeScript will enforce them.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type RequestArgs<T extends OperationId, Spec extends EndpointSpec<T> = EndpointSpec<T>> = Prettify<
	(Spec['body'] extends never ? {} : { body: Spec['body'] }) &
		(Spec['query'] extends never ? {} : { query: Spec['query'] }) &
		(Spec['path'] extends never ? {} : { params: Spec['path'] })
>;

// Conditional tuple: if RequestArgs is an empty object, the arguments are optional.
export type ExecuteArgs<TOp extends OperationId> = keyof RequestArgs<TOp> extends never ? [options?: RequestArgs<TOp>] : [options: RequestArgs<TOp>];
