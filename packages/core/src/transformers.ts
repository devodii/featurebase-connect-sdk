import { marked } from 'marked';
import { convert } from 'html-to-text';

/**
 * Converts Markdown into safe, formatted HTML using the industry-standard 'marked' engine.
 */
export function markdownToHtml(markdown: string | null | undefined): string {
	if (!markdown) return '';
	return marked.parse(markdown, { async: false });
}

/**
 * Strips HTML tags into highly readable plain text.
 * Ignores hrefs in links and skips images so the text output remains clean for AI nodes.
 */
export function htmlToText(html: string | null | undefined): string {
	if (!html) return '';
	return convert(html, {
		wordwrap: false,
		selectors: [
			{ selector: 'a', options: { ignoreHref: true } },
			{ selector: 'img', format: 'skip' },
			{ selector: 'script', format: 'skip' },
			{ selector: 'style', format: 'skip' },
		],
	}).trim();
}
