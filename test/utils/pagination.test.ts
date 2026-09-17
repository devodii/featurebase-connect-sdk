import { collectAllPages } from '../../nodes/Featurebase/utils/pagination';

describe('collectAllPages', () => {
	it('follows nextCursor until it is null', async () => {
		const pages = [
			{ data: [1, 2], nextCursor: 'cursor-2' },
			{ data: [3, 4], nextCursor: 'cursor-3' },
			{ data: [5], nextCursor: null },
		];
		let call = 0;
		const fetchPage = jest.fn(async () => pages[call++]);

		const items = await collectAllPages(fetchPage);

		expect(items).toEqual([1, 2, 3, 4, 5]);
		expect(fetchPage).toHaveBeenCalledTimes(3);
	});

	it('passes the previous nextCursor into the next fetch', async () => {
		const fetchPage = jest
			.fn()
			.mockResolvedValueOnce({ data: [1], nextCursor: 'abc' })
			.mockResolvedValueOnce({ data: [2], nextCursor: null });

		await collectAllPages(fetchPage);

		expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
		expect(fetchPage).toHaveBeenNthCalledWith(2, 'abc');
	});

	it('stops early once maxItems is reached', async () => {
		const fetchPage = jest
			.fn()
			.mockResolvedValueOnce({ data: [1, 2, 3], nextCursor: 'cursor-2' })
			.mockResolvedValueOnce({ data: [4, 5, 6], nextCursor: 'cursor-3' });

		const items = await collectAllPages(fetchPage, 4);

		expect(items).toEqual([1, 2, 3, 4]);
	});

	it('returns an empty array when the first page has no data', async () => {
		const fetchPage = jest.fn().mockResolvedValue({ data: [], nextCursor: null });
		expect(await collectAllPages(fetchPage)).toEqual([]);
	});
});
