export type PathParams = Record<string, string | number>;
export type QueryParams = Record<string, string | number | boolean | readonly (string | number)[] | undefined>;

export function buildUrl(baseUrl: string, pathTemplate: string, pathParams?: PathParams, query?: QueryParams): string {
	const path = pathTemplate.replace(/\{([^}]+)\}/g, (match, name: string) => {
		const value = pathParams?.[name];
		if (value === undefined) throw new Error(`Missing path parameter "${name}" for "${pathTemplate}"`);
		return encodeURIComponent(String(value));
	});

	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value === undefined) continue;
		for (const entry of Array.isArray(value) ? value : [value]) {
			search.append(key, String(entry));
		}
	}

	const queryString = search.toString();
	const url = `${baseUrl.replace(/\/$/, '')}${path}`;
	return queryString ? `${url}?${queryString}` : url;
}
