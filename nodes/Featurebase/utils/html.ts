const ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
	mdash: '-',
	ndash: '-',
	hellip: '...',
};

function decodeEntities(text: string): string {
	return text
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
		.replace(/&([a-zA-Z]+);/g, (match, name: string) => ENTITIES[name] ?? match);
}

const BLOCK_TAGS = /<\/(p|div|li|h[1-6]|blockquote|pre|tr)>/gi;
const BREAK_TAGS = /<br\s*\/?>/gi;

/**
 * Strips HTML tags for use in AI/text contexts (contentText output field).
 * Not a sanitizer: only intended for content Featurebase itself generated.
 */
export function htmlToText(html: string): string {
	if (!html) return '';

	let text = html.replace(BREAK_TAGS, '\n').replace(BLOCK_TAGS, '\n');
	text = text.replace(/<[^>]+>/g, '');
	text = decodeEntities(text);
	text = text.replace(/[ \t]+/g, ' ');
	text = text.replace(/\n\s*\n+/g, '\n\n');
	text = text.replace(/^[ \t]+|[ \t]+$/gm, '');

	return text.trim();
}
