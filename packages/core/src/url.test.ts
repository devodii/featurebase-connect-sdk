import { buildUrl } from './url';

describe('buildUrl', () => {
	it('joins a base url and a path with no params', () => {
		expect(buildUrl('https://do.featurebase.app', '/v2/boards')).toBe('https://do.featurebase.app/v2/boards');
	});

	it('strips a trailing slash from the base url', () => {
		expect(buildUrl('https://do.featurebase.app/', '/v2/boards')).toBe('https://do.featurebase.app/v2/boards');
	});

	it('substitutes path parameters, url-encoded', () => {
		const url = buildUrl('https://do.featurebase.app', '/v2/posts/{id}', { id: '507f 1f77' });
		expect(url).toBe('https://do.featurebase.app/v2/posts/507f%201f77');
	});

	it('throws a clear error when a path parameter is missing', () => {
		expect(() => buildUrl('https://do.featurebase.app', '/v2/posts/{id}')).toThrow('id');
	});

	it('appends query params, skipping undefined values', () => {
		const url = buildUrl('https://do.featurebase.app', '/v2/posts', undefined, { limit: 10, q: undefined, sortBy: 'recent' });
		expect(url).toBe('https://do.featurebase.app/v2/posts?limit=10&sortBy=recent');
	});

	it('repeats the key for array query values', () => {
		const url = buildUrl('https://do.featurebase.app', '/v2/tickets', undefined, { statusIds: ['a', 'b'] });
		expect(url).toBe('https://do.featurebase.app/v2/tickets?statusIds=a&statusIds=b');
	});
});
