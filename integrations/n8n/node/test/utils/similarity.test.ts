import { titleSimilarity } from '../../nodes/Featurebase/utils/similarity';

describe('titleSimilarity', () => {
	it('returns 1 for identical titles', () => {
		expect(titleSimilarity('Add dark mode', 'Add dark mode')).toBe(1);
	});

	it('is case-insensitive', () => {
		expect(titleSimilarity('Add Dark Mode', 'add dark mode')).toBe(1);
	});

	it('returns 1 for two empty strings', () => {
		expect(titleSimilarity('', '')).toBe(1);
	});

	it('returns 0 when one title is empty', () => {
		expect(titleSimilarity('Add dark mode', '')).toBe(0);
	});

	it('returns a high score for near-duplicate titles', () => {
		const score = titleSimilarity('Add dark mode support', 'Please add a dark mode');
		expect(score).toBeGreaterThan(0.4);
	});

	it('returns 0 for completely unrelated titles', () => {
		expect(titleSimilarity('Add dark mode', 'Export CSV reports')).toBe(0);
	});

	it('ignores stopwords and punctuation', () => {
		const score = titleSimilarity('The dark mode!', 'Dark mode');
		expect(score).toBe(1);
	});
});
