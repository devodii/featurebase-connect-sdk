const STOPWORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are', 'be', 'it', 'this', 'that']);

function tokenize(text: string): Set<string> {
	const words = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((word) => word.length > 0 && !STOPWORDS.has(word));

	return new Set(words);
}

/**
 * Normalised token overlap (Jaccard similarity) between two titles, 0-1.
 * Used by the Upsert Feedback workflow helper to dedupe similar posts.
 */
export function titleSimilarity(a: string, b: string): number {
	const tokensA = tokenize(a);
	const tokensB = tokenize(b);

	if (tokensA.size === 0 && tokensB.size === 0) return 1;
	if (tokensA.size === 0 || tokensB.size === 0) return 0;

	let intersectionSize = 0;
	for (const token of tokensA) {
		if (tokensB.has(token)) intersectionSize += 1;
	}

	const unionSize = tokensA.size + tokensB.size - intersectionSize;
	return unionSize === 0 ? 0 : intersectionSize / unionSize;
}
