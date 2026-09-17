export interface CursorPage<T> {
	data: T[];
	nextCursor: string | null;
}

/**
 * Walks every page of a Featurebase cursor-paginated list endpoint
 * (reference/FINDINGS.md section 3: { data, nextCursor }).
 */
export async function collectAllPages<T>(fetchPage: (cursor: string | undefined) => Promise<CursorPage<T>>, maxItems?: number): Promise<T[]> {
	const items: T[] = [];
	let cursor: string | undefined;

	do {
		const page = await fetchPage(cursor);
		items.push(...page.data);

		if (maxItems !== undefined && items.length >= maxItems) {
			return items.slice(0, maxItems);
		}

		cursor = page.nextCursor ?? undefined;
	} while (cursor);

	return items;
}
