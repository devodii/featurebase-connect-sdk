import { collectAll, paginate, type CursorPage } from './pagination';

function pagedFetcher(pages: readonly (readonly number[])[]) {
	const calls: (string | undefined)[] = [];
	const fetchPage = async (cursor: string | undefined): Promise<CursorPage<number>> => {
		calls.push(cursor);
		const index = cursor === undefined ? 0 : Number(cursor);
		const items = pages[index] ?? [];
		const nextCursor = index + 1 < pages.length ? String(index + 1) : null;
		return { items, nextCursor };
	};
	return { fetchPage, calls };
}

describe('paginate', () => {
	it('yields every item across every page in order', async () => {
		const { fetchPage } = pagedFetcher([[1, 2], [3, 4], [5]]);

		const items: number[] = [];
		for await (const item of paginate(fetchPage)) {
			items.push(item);
		}

		expect(items).toEqual([1, 2, 3, 4, 5]);
	});

	it('fetches only one page when nextCursor is null', async () => {
		const { fetchPage, calls } = pagedFetcher([[1, 2]]);

		const items: number[] = [];
		for await (const item of paginate(fetchPage)) {
			items.push(item);
		}

		expect(items).toEqual([1, 2]);
		expect(calls).toEqual([undefined]);
	});

	it('stops fetching further pages when the consumer breaks early', async () => {
		const { fetchPage, calls } = pagedFetcher([
			[1, 2],
			[3, 4],
			[5, 6],
		]);

		const items: number[] = [];
		for await (const item of paginate(fetchPage)) {
			items.push(item);
			if (items.length === 2) break;
		}

		expect(items).toEqual([1, 2]);
		expect(calls).toEqual([undefined]);
	});
});

describe('collectAll', () => {
	it('collects every item when no maxItems is given', async () => {
		const { fetchPage } = pagedFetcher([[1, 2], [3]]);
		await expect(collectAll(fetchPage)).resolves.toEqual([1, 2, 3]);
	});

	it('caps the result at maxItems without fetching pages beyond what is needed', async () => {
		const { fetchPage, calls } = pagedFetcher([
			[1, 2],
			[3, 4],
			[5, 6],
		]);

		const items = await collectAll(fetchPage, 3);

		expect(items).toEqual([1, 2, 3]);
		expect(calls).toEqual([undefined, '1']);
	});
});
