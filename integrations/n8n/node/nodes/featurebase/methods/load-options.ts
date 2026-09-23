import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult, INodePropertyOptions } from 'n8n-workflow';

import { getFeaturebaseClient } from '../featurebase-client';

/**
 * Featurebase list endpoints don't share one response shape: some return a
 * plain array (BoardList, PostStatusList), some return { data } with no
 * pagination (TeamList), and others return { data, nextCursor, ... }. This
 * normalizes all of them to an item array without assuming pagination exists.
 */
function extractItems<T>(response: unknown): T[] {
	if (Array.isArray(response)) return response as T[];
	if (response && typeof response === 'object' && 'data' in response) return (response as { data: T[] }).data;
	return [];
}

function toOptions(items: IDataObject[], nameKey: string, valueKey = 'id'): INodePropertyOptions[] {
	return items.map((item) => ({
		name: String(item[nameKey] ?? item[valueKey]),
		value: String(item[valueKey]),
	}));
}

export async function getBoards(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const boards = extractItems<IDataObject>(await client.execute('listBoards'));
	return toOptions(boards, 'name');
}

export async function getPostStatuses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const statuses = extractItems<IDataObject>(await client.execute('listPostStatuses'));
	return statuses.map((status) => ({
		name: `${status.name as string} (${status.type as string})`,
		value: String(status.id),
	}));
}

export async function getAdmins(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const admins = extractItems<IDataObject>(await client.execute('listAdmins', { query: { limit: 100 } }));
	return toOptions(admins, 'name');
}

export async function getTeams(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const teams = extractItems<IDataObject>(await client.execute('listTeams'));
	return toOptions(teams, 'name');
}

export async function getBrands(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const brands = extractItems<IDataObject>(await client.execute('listBrands', { query: { limit: 100 } }));
	return toOptions(brands, 'name');
}

export async function getCustomFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const fields = extractItems<IDataObject>(await client.execute('listCustomFields', { query: { limit: 100 } }));
	return toOptions(fields, 'label');
}

export async function getHelpCenterCollections(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const collections = extractItems<IDataObject>(await client.execute('listCollections', { query: { limit: 100 } }));
	return toOptions(collections, 'name');
}

/**
 * openapi.json has no "list post tags" endpoint - /v2/tags is the
 * Conversation Tags registry, a different object. Tags are instead
 * collected from the tag names attached to a sample of existing posts.
 */
export async function getPostTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const client = await getFeaturebaseClient(this);
	const posts = extractItems<IDataObject>(await client.execute('listPosts', { query: { limit: 100 } }));
	const tagNames = new Set<string>();

	for (const post of posts) {
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
 * operation. Featurebase list endpoints don't support server-side name
 * search, so filtering happens client-side over the fetched page.
 */
function listSearchFactory(operation: 'listBoards' | 'listPostStatuses' | 'listAdmins' | 'listTeams' | 'listBrands' | 'listCustomFields' | 'listCollections', nameKey: string) {
	return async function listSearch(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
		const client = await getFeaturebaseClient(this);
		const items = extractItems<IDataObject>(await client.execute(operation, { query: { limit: 100 } } as never));
		const results = items
			.map((item) => ({ name: String(item[nameKey] ?? item.id), value: String(item.id) }))
			.filter((item) => !filter || item.name.toLowerCase().includes(filter.toLowerCase()));

		return { results };
	};
}

export const searchBoards = listSearchFactory('listBoards', 'name');
export const searchPostStatuses = listSearchFactory('listPostStatuses', 'name');
export const searchAdmins = listSearchFactory('listAdmins', 'name');
export const searchTeams = listSearchFactory('listTeams', 'name');
export const searchBrands = listSearchFactory('listBrands', 'name');
export const searchCustomFields = listSearchFactory('listCustomFields', 'label');
export const searchHelpCenterCollections = listSearchFactory('listCollections', 'name');

export async function searchPosts(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const client = await getFeaturebaseClient(this);
	const posts = extractItems<IDataObject>(await client.execute('listPosts', { query: { limit: 50, q: filter || undefined, sortBy: 'recent' } }));

	return {
		results: posts.map((post) => ({
			name: String(post.title ?? post.id),
			value: String(post.id),
		})),
	};
}

export async function searchComments(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> {
	const client = await getFeaturebaseClient(this);
	const comments = extractItems<IDataObject>(await client.execute('listComments', { query: { limit: 50 } }));

	const results = comments
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
