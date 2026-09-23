import type { EndpointSpec, ExecuteArgs, OperationId } from './types';
import type { Fetcher, FetchRequest } from './fetcher';
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

// Define what a Plugin looks like
export interface FeaturebasePlugin {
	id: string;
	hooks?: {
		beforeExecute?: <TOp extends OperationId>(operation: TOp, args: unknown[]) => Promise<unknown[]> | unknown[];
		beforeRequest?: (request: FetchRequest) => Promise<FetchRequest> | FetchRequest;
		afterResponse?: (response: unknown, ctx: { operation: OperationId }) => Promise<unknown> | unknown;
	};
}

export interface FeaturebaseConnectOptions {
	apiKey: string;
	baseUrl?: string;
	apiVersion?: string;
	fetcher?: Fetcher;
	operations: OperationRegistry;
	retry?: RetryOptions;
	plugins?: FeaturebasePlugin[];
}

export function createFeaturebase(options: FeaturebaseConnectOptions) {
	const baseUrl = options.baseUrl ?? 'https://do.featurebase.app';
	const fetcher = options.fetcher ?? defaultFetcher;
	const plugins = options.plugins ?? [];

	// The core execute function, highly typed.
	async function execute<TOp extends OperationId>(operation: TOp, ...args: ExecuteArgs<TOp>): Promise<EndpointSpec<TOp>['response']> {
		let modifiedArgs: unknown[] = args;

		// Run beforeExecute hooks (validation happens here)
		for (const plugin of plugins) {
			if (plugin.hooks?.beforeExecute) {
				modifiedArgs = await plugin.hooks.beforeExecute(operation, modifiedArgs);
			}
		}

		const requestOptions = (modifiedArgs[0] ?? {}) as { body?: unknown; query?: unknown; params?: unknown };

		const descriptor = options.operations[operation];
		if (!descriptor) throw new Error(`No operation descriptor registered for "${operation}"`);

		let request: FetchRequest = {
			method: descriptor.method,
			url: buildUrl(baseUrl, descriptor.path, requestOptions.params as never, requestOptions.query as never),
			body: requestOptions.body,
			headers: {
				Authorization: `Bearer ${options.apiKey}`,
				'Content-Type': 'application/json',
				...(options.apiVersion ? { 'Featurebase-Version': options.apiVersion } : {}),
			},
		};

		// Run beforeRequest hooks (plugins modifying the outgoing request)
		for (const plugin of plugins) {
			if (plugin.hooks?.beforeRequest) {
				request = await plugin.hooks.beforeRequest(request);
			}
		}

		const response = await withRetry(() => fetcher(request), options.retry);

		// Run afterResponse hooks
		let data: unknown = response.body;
		for (const plugin of plugins) {
			if (plugin.hooks?.afterResponse) {
				data = await plugin.hooks.afterResponse(data, { operation });
			}
		}

		return data as EndpointSpec<TOp>['response'];
	}

	return {
		execute,
		// Expose plugin utilities if integrations need to bind to the client
		$plugins: plugins.reduce<Record<string, FeaturebasePlugin>>((acc, plugin) => ({ ...acc, [plugin.id]: plugin }), {}),
	};
}

const defaultFetcher: Fetcher = async (request) => {
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body === undefined ? undefined : JSON.stringify(request.body),
	});

	const body = await response.json().catch(() => undefined);
	return { status: response.status, headers: Object.fromEntries(response.headers), body };
};
