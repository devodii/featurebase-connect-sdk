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
import { buildUrl, collectAll, featurebaseRetryOptions, withRetry, type CursorPage, type FetchRequest } from '@featurebase-connect-sdk/core';

import { createN8nFetcher, type N8nContext } from './n8n-fetcher';

type FeaturebaseContext = IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions | IWebhookFunctions;

interface FeaturebaseErrorBody {
	error?: {
		type?: string;
		code?: string;
		message?: string;
		param?: string;
	};
}

function buildReadableMessage(error: unknown): string {
	const body = (error as { response?: { body?: unknown } }).response?.body as FeaturebaseErrorBody | undefined;

	if (body?.error) {
		const { type, code, message, param } = body.error;
		const paramSuffix = param ? ` (param: ${param})` : '';
		return `Featurebase ${code ?? type ?? 'error'}: ${message ?? 'Unknown error'}${paramSuffix}`;
	}

	return error instanceof Error ? error.message : 'Unknown Featurebase API error';
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
	const fetcher = createN8nFetcher(this as N8nContext);

	const request: FetchRequest = {
		method,
		url: buildUrl(baseUrl, endpoint, undefined, qs as never),
		body: Object.keys(body).length > 0 ? body : undefined,
	};

	try {
		const response = await withRetry(() => fetcher(request), featurebaseRetryOptions());
		return response.body as IDataObject;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, { message: buildReadableMessage(error) });
	}
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
			items: (response.data as T[]) ?? [],
			nextCursor: (response.nextCursor as string | null) ?? null,
		};
	};

	return collectAll<T>(fetchPage, returnAll ? undefined : (limit ?? (qs.limit as number)));
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
	return toOptions(fields as IDataObject[], 'label');
}

export async function getHelpCenterCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const collections = await featurebaseApiRequestAllItems.call(this, '/v2/help_center/collections');
	return toOptions(collections as IDataObject[], 'name');
}

/**
 * openapi.json has no "list post tags" endpoint - /v2/tags is the
 * Conversation Tags registry, a different object. Tags are instead
 * collected from the tag names attached to a sample of existing posts.
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
	return async function listSearch(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
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
export const searchCustomFields = listSearchFactory('/v2/custom_fields', 'label');
export const searchHelpCenterCollections = listSearchFactory('/v2/help_center/collections', 'name');

export async function searchPosts(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const posts = await featurebaseApiRequestAllItems.call(this, '/v2/posts', { limit: 50, q: filter || undefined, sortBy: 'recent' }, false, 50);

	return {
		results: (posts as IDataObject[]).map((post) => ({
			name: String(post.title ?? post.id),
			value: String(post.id),
		})),
	};
}

export async function searchComments(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const comments = await featurebaseApiRequestAllItems.call(this, '/v2/comments', { limit: 50 }, false, 50);

	const results = (comments as IDataObject[])
		.map((comment) => {
			const text = String(comment.content ?? '').replace(/<[^>]+>/g, '');
			return {
				name: text.length > 60 ? `${text.slice(0, 60)}...` : text || String(comment.id),
				value: String(comment.id),
			};
		})
		.filter((item) => !filter || item.name.toLowerCase().includes(filter.toLowerCase()));

	return { results };
}
