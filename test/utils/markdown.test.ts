import { markdownToHtml } from '../../nodes/Featurebase/utils/markdown';

describe('markdownToHtml', () => {
	it('returns an empty string for empty input', () => {
		expect(markdownToHtml('')).toBe('');
	});

	it('converts headings', () => {
		expect(markdownToHtml('# Title')).toBe('<h1>Title</h1>');
		expect(markdownToHtml('### Sub')).toBe('<h3>Sub</h3>');
	});

	it('converts bold and italic', () => {
		expect(markdownToHtml('**bold** and *italic*')).toBe('<p><strong>bold</strong> and <em>italic</em></p>');
	});

	it('converts links', () => {
		expect(markdownToHtml('[n8n](https://n8n.io)')).toBe('<p><a href="https://n8n.io">n8n</a></p>');
	});

	it('converts inline code', () => {
		expect(markdownToHtml('use `npm install`')).toBe('<p>use <code>npm install</code></p>');
	});

	it('converts fenced code blocks with a language class', () => {
		const markdown = '```js\nconst x = 1;\n```';
		expect(markdownToHtml(markdown)).toBe('<pre><code class="language-js">const x = 1;</code></pre>');
	});

	it('converts unordered lists', () => {
		expect(markdownToHtml('- one\n- two')).toBe('<ul><li>one</li><li>two</li></ul>');
	});

	it('converts ordered lists', () => {
		expect(markdownToHtml('1. one\n2. two')).toBe('<ol><li>one</li><li>two</li></ol>');
	});

	it('escapes HTML in plain text', () => {
		expect(markdownToHtml('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
	});

	it('joins multi-line paragraphs with a space', () => {
		expect(markdownToHtml('line one\nline two')).toBe('<p>line one line two</p>');
	});

	it('separates blocks split by a blank line', () => {
		expect(markdownToHtml('first\n\nsecond')).toBe('<p>first</p><p>second</p>');
	});
});
