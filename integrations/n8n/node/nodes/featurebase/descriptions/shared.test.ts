import { cleanAuthorInput, extractId, extractItems, pick } from './shared';

describe('extractId', () => {
	it('extracts the value from a resourceLocator-shaped object', () => {
		expect(extractId({ mode: 'list', value: 'b1' })).toBe('b1');
	});

	it('stringifies a resourceLocator value that is not already a string', () => {
		expect(extractId({ mode: 'list', value: 42 })).toBe('42');
	});

	it('stringifies a plain value with no value property', () => {
		expect(extractId('p1')).toBe('p1');
		expect(extractId(42)).toBe('42');
	});
});

describe('cleanAuthorInput', () => {
	it('returns undefined for an undefined input', () => {
		expect(cleanAuthorInput(undefined)).toBeUndefined();
	});

	it('returns undefined for an empty object', () => {
		expect(cleanAuthorInput({})).toBeUndefined();
	});

	it('drops empty string, null, and undefined fields', () => {
		expect(cleanAuthorInput({ email: '', userId: undefined, name: null as never, id: 'u1' })).toEqual({ id: 'u1' });
	});

	it('returns undefined when every field is empty', () => {
		expect(cleanAuthorInput({ email: '', userId: '' })).toBeUndefined();
	});

	it('keeps every non-empty field', () => {
		expect(cleanAuthorInput({ email: 'a@b.com', name: 'Ada' })).toEqual({ email: 'a@b.com', name: 'Ada' });
	});
});

describe('pick', () => {
	it('keeps only the requested fields that exist on the item', () => {
		expect(pick({ id: 'p1', title: 'hi', secret: 'x' }, ['id', 'title'])).toEqual({ id: 'p1', title: 'hi' });
	});

	it('omits requested fields that are missing from the item', () => {
		expect(pick({ id: 'p1' }, ['id', 'title'])).toEqual({ id: 'p1' });
	});

	it('returns an empty object when no fields are requested', () => {
		expect(pick({ id: 'p1' }, [])).toEqual({});
	});
});

describe('extractItems', () => {
	it('returns a plain array response as is', () => {
		expect(extractItems([{ id: 'b1' }])).toEqual([{ id: 'b1' }]);
	});

	it('returns the data field of a paginated response', () => {
		expect(extractItems({ data: [{ id: 'p1' }], nextCursor: null })).toEqual([{ id: 'p1' }]);
	});

	it('returns an empty array for a response with neither shape', () => {
		expect(extractItems({ foo: 'bar' })).toEqual([]);
		expect(extractItems(null)).toEqual([]);
		expect(extractItems(undefined)).toEqual([]);
	});
});
