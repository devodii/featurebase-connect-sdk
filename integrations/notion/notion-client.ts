import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

// Pinned so every request parses the same way; bump this if you need a newer Notion
// API version. https://developers.notion.com/reference/versioning
// @unchecked-notion-api-version: current at the time this was written, not re-verified live.
const NOTION_VERSION = '2022-06-28';
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
	return { status: response.status, headers: Object.fromEntries(response.headers), body };
};

// @unchecked-notion-rate-limit: Notion documents "an average of 3 requests per second"
// without an exact burst/window definition, so this retries on 429 with backoff rather
// than assuming a precise threshold. https://developers.notion.com/reference/request-limits
function isRateLimited(error: unknown): boolean {
	return error instanceof NotionApiError && error.status === 429;
}

export class NotionClient {
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

	/** Finds existing pages in a database matching a Notion filter object (same shape as the Notion API's own `filter`). */
	async queryDatabase(databaseId: string, filter: Record<string, unknown>): Promise<NotionPage[]> {
		const result = await this.request<{ results: NotionPage[] }>({
			method: 'POST',
			url: `${NOTION_API_BASE}/databases/${databaseId}/query`,
			body: { filter },
		});
		return result.results;
	}

	async createPage(databaseId: string, properties: NotionProperties): Promise<NotionPage> {
		return this.request<NotionPage>({
			method: 'POST',
			url: `${NOTION_API_BASE}/pages`,
			body: { parent: { database_id: databaseId }, properties },
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
