import { applyFormatting } from './formatting';

describe('applyFormatting', () => {
	it('adds contentText from a content field', () => {
		const plugin = applyFormatting();

		const result = plugin.hooks!.afterResponse!({ id: 'p1', content: '<p>Hello <strong>world</strong></p>' }, { operation: 'getPost' as never }) as Record<
			string,
			unknown
		>;

		expect(result.contentText).toBe('Hello world');
	});

	it('adds contentText from a body field', () => {
		const plugin = applyFormatting();

		const result = plugin.hooks!.afterResponse!({ id: 'a1', body: '<p>Article body</p>' }, { operation: 'getArticle' as never }) as Record<string, unknown>;

		expect(result.contentText).toBe('Article body');
	});

	it('recurses into nested objects and arrays', () => {
		const plugin = applyFormatting();

		const result = plugin.hooks!.afterResponse!(
			{
				data: [
					{ id: 'p1', content: '<p>one</p>' },
					{ id: 'p2', content: '<p>two</p>' },
				],
				nextCursor: null,
			},
			{ operation: 'listPosts' as never },
		) as { data: Record<string, unknown>[] };

		expect(result.data[0].contentText).toBe('one');
		expect(result.data[1].contentText).toBe('two');
	});

	it('leaves non-string content and body fields alone', () => {
		const plugin = applyFormatting();

		const result = plugin.hooks!.afterResponse!({ id: 'p1', content: null, body: 42 }, { operation: 'getPost' as never }) as Record<string, unknown>;

		expect(result.contentText).toBeUndefined();
	});

	it('leaves data with neither a content nor a body field untouched', () => {
		const plugin = applyFormatting();

		const result = plugin.hooks!.afterResponse!({ id: 'b1', name: 'Feature Requests' }, { operation: 'listBoards' as never }) as Record<string, unknown>;

		expect(result).toEqual({ id: 'b1', name: 'Feature Requests' });
	});

	it('passes primitive and null responses through untouched', () => {
		const plugin = applyFormatting();

		expect(plugin.hooks!.afterResponse!(null, { operation: 'deletePost' as never })).toBeNull();
		expect(plugin.hooks!.afterResponse!('ok', { operation: 'deletePost' as never })).toBe('ok');
	});
});
