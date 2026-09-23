import { marked } from 'marked';
import { convert } from 'html-to-text';

/** Converts markdown into HTML using `marked`, since Featurebase stores post/comment content as HTML. */
export function markdownToHtml(markdown: string): string {
	if (!markdown) return '';
	return marked.parse(markdown, { async: false });
}

/** Strips HTML down to plain text using `html-to-text`, for contexts (AI nodes, summaries) that want readable text. */
export function htmlToText(html: string): string {
	if (!html) return '';
	return convert(html, {
		wordwrap: false,
		selectors: [
			{ selector: 'a', options: { ignoreHref: true } },
			{ selector: 'img', format: 'skip' },
		],
	}).trim();
}
