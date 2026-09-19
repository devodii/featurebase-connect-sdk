export interface FetchRequest {
	method: string;
	url: string;
	body?: unknown;
	headers?: Record<string, string>;
}

export interface FetchResponse<TBody = unknown> {
	status: number;
	headers: Record<string, string>;
	body: TBody;
}

export type Fetcher = (request: FetchRequest) => Promise<FetchResponse>;
