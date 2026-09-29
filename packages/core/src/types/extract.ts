import type { operations } from '../generated/openapi';

export type OperationId = keyof operations;

type JsonPayload<T> = T extends { content: { 'application/json': infer U } } ? U : never;

// Status keys are numeric literals, so coerce to string to pattern-match against `2${string}`.
type SuccessResponse<T> = {
	[K in keyof T as `${K & (string | number)}` extends `2${string}` ? K : never]: T[K];
};

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

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

type RequestArgs<T extends OperationId, Spec extends EndpointSpec<T> = EndpointSpec<T>> = Prettify<
	(Spec['body'] extends never ? {} : { body: Spec['body'] }) &
		(Spec['query'] extends never ? {} : { query: Spec['query'] }) &
		(Spec['path'] extends never ? {} : { params: Spec['path'] })
>;

export type ExecuteArgs<TOp extends OperationId> = keyof RequestArgs<TOp> extends never ? [options?: RequestArgs<TOp>] : [options: RequestArgs<TOp>];
