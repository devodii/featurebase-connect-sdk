import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

// Pinned to Notion's current API version so requests always parse the same way.
const NOTION_VERSION = '2025-09-03';
const NOTION_API_BASE = 'https://api.notion.com/v1';

export type NotionPropertyValue = Record<string, unknown>;
export type NotionProperties = Record<string, NotionPropertyValue>;

export interface NotionPage {
	id: string;
	properties: NotionProperties;
}

export interface NotionClientOptions {
	apiKey: string;
	fetcher?: _$featurebaseconnect0.Fetcher;
}

export class NotionApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly body: unknown,
	) {
		super(`Notion API request failed with status ${status}`);
		this.name = 'NotionApiError';
	}
}

export const defaultNotionFetcher: _$featurebaseconnect0.Fetcher = async (request) => {
	const response = await fetch(request.url, {
		method: request.method,
		headers: request.headers,
		body: request.body === undefined ? undefined : JSON.stringify(request.body),
	});
	const body = await response.json().catch(() => undefined);
	return { status: response.status, headers: Object.fromEntries(response.headers.entries()), body };
};

// Notion's rate limit varies by plan and workspace, so retry generically on 429 rather
// than hardcode a threshold.
function isRateLimited(error: unknown): boolean {
	return error instanceof NotionApiError && error.status === 429;
}

export class NotionClient {
	// Cached so a sync run resolves each database's data source id once, not once per page.
	private readonly dataSourceIdCache = new Map<string, string>();

	constructor(private readonly options: NotionClientOptions) {}

	private async request<T>(req: Pick<_$featurebaseconnect0.FetchRequest, 'method' | 'url' | 'body'>): Promise<T> {
		const fetcher = this.options.fetcher ?? defaultNotionFetcher;

		const response = await _$featurebaseconnect0.withRetry(
			async () => {
				const res = await fetcher({
					...req,
					headers: {
						Authorization: `Bearer ${this.options.apiKey}`,
						'Notion-Version': NOTION_VERSION,
						'Content-Type': 'application/json',
					},
				});
				if (res.status >= 400) throw new NotionApiError(res.status, res.body);
				return res;
			},
			{ shouldRetry: isRateLimited },
		);

		return response.body as T;
	}

	// Only a single-data-source database is supported; fails loudly instead of guessing
	// which data source a page belongs to.
	private async resolveDataSourceId(databaseId: string): Promise<string> {
		const cached = this.dataSourceIdCache.get(databaseId);
		if (cached) return cached;

		const database = await this.request<{ data_sources: { id: string; name: string }[] }>({
			method: 'GET',
			url: `${NOTION_API_BASE}/databases/${databaseId}`,
		});

		if (database.data_sources.length !== 1) {
			throw new Error(
				`Notion database ${databaseId} has ${database.data_sources.length} data sources; this integration only supports a database with exactly one data source.`,
			);
		}

		const dataSourceId = database.data_sources[0].id;
		this.dataSourceIdCache.set(databaseId, dataSourceId);
		return dataSourceId;
	}

	/** Finds existing pages in a database matching a Notion filter object (same shape as the Notion API's own `filter`). */
	async queryDatabase(databaseId: string, filter: Record<string, unknown>): Promise<NotionPage[]> {
		const dataSourceId = await this.resolveDataSourceId(databaseId);
		const result = await this.request<{ results: NotionPage[] }>({
			method: 'POST',
			url: `${NOTION_API_BASE}/data_sources/${dataSourceId}/query`,
			body: { filter },
		});
		return result.results;
	}

	async createPage(databaseId: string, properties: NotionProperties): Promise<NotionPage> {
		const dataSourceId = await this.resolveDataSourceId(databaseId);
		return this.request<NotionPage>({
			method: 'POST',
			url: `${NOTION_API_BASE}/pages`,
			body: { parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties },
		});
	}

	async updatePage(pageId: string, properties: NotionProperties): Promise<NotionPage> {
		return this.request<NotionPage>({
			method: 'PATCH',
			url: `${NOTION_API_BASE}/pages/${pageId}`,
			body: { properties },
		});
	}
}

export function createNotionClient(options: NotionClientOptions): NotionClient {
	return new NotionClient(options);
}

// Notion property value builders for the types this integration actually uses.
// https://developers.notion.com/reference/property-value-object
export const notionProperty = {
	title: (text: string): NotionPropertyValue => ({ title: [{ text: { content: text } }] }),
	richText: (text: string): NotionPropertyValue => ({ rich_text: [{ text: { content: text } }] }),
	number: (value: number): NotionPropertyValue => ({ number: value }),
	url: (value: string): NotionPropertyValue => ({ url: value }),
	select: (name: string): NotionPropertyValue => ({ select: { name } }),
};
