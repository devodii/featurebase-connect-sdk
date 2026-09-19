import type { ExtractBody, ExtractResponse, OperationId, OperationPath, OperationQuery } from '@featurebase-connect-sdk/types';
import type { ZodTypeAny } from 'zod';
import type { Fetcher } from './fetcher';
import { withRetry, type RetryOptions } from './retry';
import { buildUrl, type PathParams, type QueryParams } from './url';

export interface OperationDescriptor {
	method: string;
	path: string;
}

export type OperationRegistry = Partial<Record<OperationId, OperationDescriptor>>;

export interface ValidationIssue {
	path: readonly (string | number)[];
	message: string;
}

export class FeaturebaseValidationError extends Error {
	constructor(
		public readonly operation: OperationId,
		public readonly issues: readonly ValidationIssue[],
	) {
		super(`Validation failed for "${operation}": ${issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
		this.name = 'FeaturebaseValidationError';
	}
}

export interface FeaturebaseClientOptions {
	baseUrl: string;
	fetcher: Fetcher;
	operations: OperationRegistry;
	schemas?: Partial<Record<OperationId, ZodTypeAny>>;
	retry?: RetryOptions;
	headers?: Record<string, string>;
}

type RequestOptions<TOp extends OperationId> = [OperationPath<TOp>] extends [never]
	? { query?: OperationQuery<TOp> }
	: { pathParams: OperationPath<TOp>; query?: OperationQuery<TOp> };

export type ExecuteArgs<TOp extends OperationId> = [OperationPath<TOp>] extends [never]
	? [ExtractBody<TOp>] extends [never]
		? [payload?: undefined, options?: RequestOptions<TOp>]
		: [payload: ExtractBody<TOp>, options?: RequestOptions<TOp>]
	: [ExtractBody<TOp>] extends [never]
		? [payload: undefined, options: RequestOptions<TOp>]
		: [payload: ExtractBody<TOp>, options: RequestOptions<TOp>];

export class FeaturebaseClient {
	constructor(private readonly options: FeaturebaseClientOptions) {}

	async execute<TOp extends OperationId>(operation: TOp, ...args: ExecuteArgs<TOp>): Promise<ExtractResponse<TOp>> {
		const [rawPayload, requestOptions] = args as [ExtractBody<TOp> | undefined, RequestOptions<TOp> | undefined];

		const descriptor = this.options.operations[operation];
		if (!descriptor) throw new Error(`No operation descriptor registered for "${operation}"`);

		const payload = rawPayload === undefined ? rawPayload : this.validate(operation, rawPayload);

		const pathParams = requestOptions && 'pathParams' in requestOptions ? (requestOptions.pathParams as PathParams) : undefined;
		const url = buildUrl(this.options.baseUrl, descriptor.path, pathParams, requestOptions?.query as QueryParams | undefined);

		const response = await withRetry(
			() => this.options.fetcher({ method: descriptor.method, url, body: payload, headers: this.options.headers }),
			this.options.retry,
		);

		return response.body as ExtractResponse<TOp>;
	}

	private validate<TOp extends OperationId>(operation: TOp, payload: ExtractBody<TOp>): ExtractBody<TOp> {
		const schema = this.options.schemas?.[operation];
		if (!schema) return payload;

		const result = schema.safeParse(payload);
		if (!result.success) {
			throw new FeaturebaseValidationError(
				operation,
				result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
			);
		}
		return result.data as ExtractBody<TOp>;
	}
}
