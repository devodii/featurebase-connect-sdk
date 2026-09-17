import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { CursorPage } from './utils/pagination';
import { collectAllPages } from './utils/pagination';

type FeaturebaseContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IWebhookFunctions;

interface FeaturebaseErrorBody {
	error?: {
		type?: string;
		code?: string;
		message?: string;
		param?: string;
		status?: number;
	};
}

const MAX_RATE_LIMIT_RETRIES = 5;
const BASE_BACKOFF_MS = 500;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrorBody(error: unknown): FeaturebaseErrorBody | undefined {
	const err = error as {
		response?: { body?: unknown; data?: unknown; headers?: Record<string, string> };
		cause?: { response?: { body?: unknown; data?: unknown } };
	};

	const candidate = err.response?.body ?? err.response?.data ?? err.cause?.response?.body;

	if (candidate && typeof candidate === 'object' && 'error' in candidate) {
		return candidate as FeaturebaseErrorBody;
	}

	return undefined;
}

function extractStatusCode(error: unknown): number | undefined {
	const err = error as { response?: { statusCode?: number; status?: number }; statusCode?: number };
	return err.response?.statusCode ?? err.response?.status ?? err.statusCode;
}

function extractRetryAfterMs(error: unknown): number | undefined {
	const err = error as { response?: { headers?: Record<string, string> } };
	const header = err.response?.headers?.['retry-after'] ?? err.response?.headers?.['Retry-After'];
	if (!header) return undefined;

	const seconds = Number(header);
	return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

function isRateLimitError(error: unknown): boolean {
	const body = extractErrorBody(error);
	return body?.error?.type === 'rate_limit_error' || extractStatusCode(error) === 429;
}

function buildReadableMessage(error: unknown): string {
	const body = extractErrorBody(error);

	if (body?.error) {
		const { type, code, message, param } = body.error;
		const paramSuffix = param ? ` (param: ${param})` : '';
		return `Featurebase ${code ?? type ?? 'error'}: ${message ?? 'Unknown error'}${paramSuffix}`;
	}

	return error instanceof Error ? error.message : 'Unknown Featurebase API error';
}

async function requestWithRetry(
	context: FeaturebaseContext,
	options: IDataObject,
): Promise<IDataObject> {
	let attempt = 0;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		try {
			return (await context.helpers.httpRequestWithAuthentication.call(
				context,
				'featurebaseApi',
				options as never,
			)) as IDataObject;
		} catch (error) {
			if (isRateLimitError(error) && attempt < MAX_RATE_LIMIT_RETRIES) {
				attempt += 1;
				const retryAfter = extractRetryAfterMs(error);
				const backoff = retryAfter ?? BASE_BACKOFF_MS * 2 ** (attempt - 1);
				const jitter = Math.random() * backoff * 0.25;
				await sleep(backoff + jitter);
				continue;
			}

			throw new NodeApiError(context.getNode(), error as JsonObject, {
				message: buildReadableMessage(error),
			});
		}
	}
}

export async function featurebaseApiRequest(
	this: FeaturebaseContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('featurebaseApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://do.featurebase.app';

	const options: IDataObject = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		qs,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	return requestWithRetry(this, options);
}

export async function featurebaseApiRequestAllItems<T = IDataObject>(
	this: FeaturebaseContext,
	endpoint: string,
	qs: IDataObject = {},
	returnAll = true,
	limit?: number,
): Promise<T[]> {
	const fetchPage = async (cursor: string | undefined): Promise<CursorPage<T>> => {
		const response = await featurebaseApiRequest.call(this, 'GET', endpoint, {}, { ...qs, cursor });
		return {
			data: (response.data as T[]) ?? [],
			nextCursor: (response.nextCursor as string | null) ?? null,
		};
	};

	return collectAllPages<T>(fetchPage, returnAll ? undefined : (limit ?? (qs.limit as number)));
}

function toOptions(items: IDataObject[], nameKey: string, valueKey = 'id'): INodePropertyOptions[] {
	return items.map((item) => ({
		name: String(item[nameKey] ?? item[valueKey]),
		value: String(item[valueKey]),
	}));
}

export async function getBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const boards = await featurebaseApiRequestAllItems.call(this, '/v2/boards');
	return toOptions(boards as IDataObject[], 'name');
}

export async function getPostStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const statuses = await featurebaseApiRequestAllItems.call(this, '/v2/post_statuses');
	return (statuses as IDataObject[]).map((status) => ({
		name: `${status.name as string} (${status.type as string})`,
		value: String(status.id),
	}));
}

export async function getAdmins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const admins = await featurebaseApiRequestAllItems.call(this, '/v2/admins');
	return toOptions(admins as IDataObject[], 'name');
}

export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const teams = await featurebaseApiRequestAllItems.call(this, '/v2/teams');
	return toOptions(teams as IDataObject[], 'name');
}

export async function getBrands(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const brands = await featurebaseApiRequestAllItems.call(this, '/v2/brands');
	return toOptions(brands as IDataObject[], 'name');
}

export async function getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const fields = await featurebaseApiRequestAllItems.call(this, '/v2/custom_fields');
	return toOptions(fields as IDataObject[], 'name');
}

export async function getHelpCenterCollections(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const collections = await featurebaseApiRequestAllItems.call(this, '/v2/help_center/collections');
	return toOptions(collections as IDataObject[], 'name');
}

/**
 * There is no dedicated "list post tags" endpoint (reference/FINDINGS.md
 * section 10 - /v2/tags is the Conversation Tags registry, a different
 * object). Tags are instead collected from the tag names attached to a
 * sample of existing posts.
 */
export async function getPostTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const posts = await featurebaseApiRequestAllItems.call(this, '/v2/posts', { limit: 100 }, false, 100);
	const tagNames = new Set<string>();

	for (const post of posts as IDataObject[]) {
		const tags = (post.tags as IDataObject[]) ?? [];
		for (const tag of tags) {
			if (typeof tag.name === 'string') tagNames.add(tag.name);
		}
	}

	return Array.from(tagNames)
		.sort()
		.map((name) => ({ name, value: name }));
}

/**
 * Builds a resourceLocator "From List" search method for a given list
 * endpoint. Featurebase list endpoints don't support server-side name
 * search, so filtering happens client-side over the fetched page.
 */
function listSearchFactory(endpoint: string, nameKey: string) {
	return async function listSearch(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		const items = await featurebaseApiRequestAllItems.call(this, endpoint, { limit: 100 }, false, 100);
		const results = (items as IDataObject[])
			.map((item) => ({ name: String(item[nameKey] ?? item.id), value: String(item.id) }))
			.filter((item) => !filter || item.name.toLowerCase().includes(filter.toLowerCase()));

		return { results };
	};
}

export const searchBoards = listSearchFactory('/v2/boards', 'name');
export const searchPostStatuses = listSearchFactory('/v2/post_statuses', 'name');
export const searchAdmins = listSearchFactory('/v2/admins', 'name');
export const searchTeams = listSearchFactory('/v2/teams', 'name');
export const searchBrands = listSearchFactory('/v2/brands', 'name');
export const searchCustomFields = listSearchFactory('/v2/custom_fields', 'name');
export const searchHelpCenterCollections = listSearchFactory('/v2/help_center/collections', 'name');

export async function searchPosts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const posts = await featurebaseApiRequestAllItems.call(
		this,
		'/v2/posts',
		{ limit: 50, q: filter || undefined, sortBy: 'recent' },
		false,
		50,
	);

	return {
		results: (posts as IDataObject[]).map((post) => ({
			name: String(post.title ?? post.id),
			value: String(post.id),
		})),
	};
}

export async function searchComments(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const comments = await featurebaseApiRequestAllItems.call(this, '/v2/comments', { limit: 50 }, false, 50);

	const results = (comments as IDataObject[])
		.map((comment) => {
			const text = String(comment.content ?? '').replace(/<[^>]+>/g, '');
			return { name: text.length > 60 ? `${text.slice(0, 60)}...` : text || String(comment.id), value: String(comment.id) };
		})
		.filter((item) => !filter || item.name.toLowerCase().includes(filter.toLowerCase()));

	return { results };
}
