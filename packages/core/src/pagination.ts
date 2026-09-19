export interface CursorPage<TItem, TCursor = string> {
	items: readonly TItem[];
	nextCursor: TCursor | null;
}

export async function* paginate<TItem, TCursor = string>(
	fetchPage: (cursor: TCursor | undefined) => Promise<CursorPage<TItem, TCursor>>,
): AsyncGenerator<TItem, void, undefined> {
	let cursor: TCursor | undefined;

	do {
		const page = await fetchPage(cursor);
		yield* page.items;
		cursor = page.nextCursor ?? undefined;
	} while (cursor !== undefined);
}

export async function collectAll<TItem, TCursor = string>(
	fetchPage: (cursor: TCursor | undefined) => Promise<CursorPage<TItem, TCursor>>,
	maxItems?: number,
): Promise<TItem[]> {
	const items: TItem[] = [];

	for await (const item of paginate(fetchPage)) {
		items.push(item);
		if (maxItems !== undefined && items.length >= maxItems) break;
	}

	return items;
}
