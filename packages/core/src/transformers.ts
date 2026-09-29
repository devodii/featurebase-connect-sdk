import { marked } from 'marked';
import { convert } from 'html-to-text';

export function markdownToHtml(markdown: string | null | undefined): string {
	if (!markdown) return '';
	return marked.parse(markdown, { async: false });
}

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
