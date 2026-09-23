import type { EndpointSpec, OperationId } from './types';
import type { Fetcher } from './fetcher';
import type { SchemaRegistry } from './registry';
import { withRetry, type RetryOptions } from './retry';
import { buildUrl } from './url';

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
	schemas?: SchemaRegistry;
	retry?: RetryOptions;
	headers?: Record<string, string>;
}

type RequestOptions<TOp extends OperationId> = [EndpointSpec<TOp>['path']] extends [never]
	? { query?: EndpointSpec<TOp>['query'] }
	: { pathParams: EndpointSpec<TOp>['path']; query?: EndpointSpec<TOp>['query'] };

export type ExecuteArgs<TOp extends OperationId> = [EndpointSpec<TOp>['path']] extends [never]
	? [EndpointSpec<TOp>['body']] extends [never]
		? [payload?: undefined, options?: RequestOptions<TOp>]
		: [payload: EndpointSpec<TOp>['body'], options?: RequestOptions<TOp>]
	: [EndpointSpec<TOp>['body']] extends [never]
		? [payload: undefined, options: RequestOptions<TOp>]
		: [payload: EndpointSpec<TOp>['body'], options: RequestOptions<TOp>];

export class FeaturebaseClient {
	constructor(private readonly options: FeaturebaseClientOptions) {}

	async execute<TOp extends OperationId>(operation: TOp, ...args: ExecuteArgs<TOp>): Promise<EndpointSpec<TOp>['response']> {
		const [rawPayload, requestOptions] = args as [EndpointSpec<TOp>['body'] | undefined, RequestOptions<TOp> | undefined];

		const descriptor = this.options.operations[operation];
		if (!descriptor) throw new Error(`No operation descriptor registered for "${operation}"`);

		const payload = rawPayload === undefined ? rawPayload : this.validate(operation, rawPayload);

		const pathParams = requestOptions && 'pathParams' in requestOptions ? requestOptions.pathParams : undefined;
		const url = buildUrl(this.options.baseUrl, descriptor.path, pathParams, requestOptions?.query);

		const response = await withRetry(
			() => this.options.fetcher({ method: descriptor.method, url, body: payload, headers: this.options.headers }),
			this.options.retry,
		);

		return response.body as EndpointSpec<TOp>['response'];
	}

	private validate<TOp extends OperationId>(operation: TOp, payload: EndpointSpec<TOp>['body']): EndpointSpec<TOp>['body'] {
		const schema = this.options.schemas?.[operation];
		if (!schema) return payload;

		const result = schema.safeParse(payload);
		if (!result.success) {
			throw new FeaturebaseValidationError(
				operation,
				result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
			);
		}
		return result.data as EndpointSpec<TOp>['body'];
	}
}
