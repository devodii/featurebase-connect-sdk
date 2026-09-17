function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
	let result = escapeHtml(text);

	result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
	result = result.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
	result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
	result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');
	result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
	result = result.replace(/(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g, '<em>$1</em>');

	return result;
}

interface Block {
	type: 'heading' | 'paragraph' | 'ul' | 'ol' | 'code' | 'blank';
	level?: number;
	lines: string[];
	lang?: string;
}

function parseBlocks(markdown: string): Block[] {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const blocks: Block[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (/^```/.test(line)) {
			const lang = line.replace(/^```/, '').trim();
			const codeLines: string[] = [];
			i += 1;
			while (i < lines.length && !/^```/.test(lines[i])) {
				codeLines.push(lines[i]);
				i += 1;
			}
			i += 1;
			blocks.push({ type: 'code', lines: codeLines, lang });
			continue;
		}

		const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line);
		if (headingMatch) {
			blocks.push({ type: 'heading', level: headingMatch[1].length, lines: [headingMatch[2]] });
			i += 1;
			continue;
		}

		if (/^\s*[-*]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
				i += 1;
			}
			blocks.push({ type: 'ul', lines: items });
			continue;
		}

		if (/^\s*\d+\.\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
				i += 1;
			}
			blocks.push({ type: 'ol', lines: items });
			continue;
		}

		if (line.trim() === '') {
			blocks.push({ type: 'blank', lines: [] });
			i += 1;
			continue;
		}

		const paragraphLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!/^```/.test(lines[i]) &&
			!/^(#{1,6})\s+/.test(lines[i]) &&
			!/^\s*[-*]\s+/.test(lines[i]) &&
			!/^\s*\d+\.\s+/.test(lines[i])
		) {
			paragraphLines.push(lines[i]);
			i += 1;
		}
		blocks.push({ type: 'paragraph', lines: paragraphLines });
	}

	return blocks;
}

/**
 * Converts a practical subset of markdown to HTML: headings, bold, italic,
 * links, inline code, fenced code blocks, lists, and paragraphs. Featurebase's
 * API stores post/comment content as HTML, not markdown, so this runs client-side
 * before content is sent (see reference/FINDINGS.md section 9).
 */
export function markdownToHtml(markdown: string): string {
	if (!markdown) return '';

	const blocks = parseBlocks(markdown);
	const html: string[] = [];

	for (const block of blocks) {
		switch (block.type) {
			case 'blank':
				break;
			case 'heading':
				html.push(`<h${block.level}>${renderInline(block.lines[0])}</h${block.level}>`);
				break;
			case 'code': {
				const langAttr = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : '';
				html.push(`<pre><code${langAttr}>${escapeHtml(block.lines.join('\n'))}</code></pre>`);
				break;
			}
			case 'ul':
				html.push(`<ul>${block.lines.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
				break;
			case 'ol':
				html.push(`<ol>${block.lines.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`);
				break;
			case 'paragraph':
				html.push(`<p>${renderInline(block.lines.join(' '))}</p>`);
				break;
			default:
				break;
		}
	}

	return html.join('');
}
