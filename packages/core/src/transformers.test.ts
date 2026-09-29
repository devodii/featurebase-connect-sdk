import { htmlToText, markdownToHtml } from './transformers';

describe('markdownToHtml', () => {
	it('returns an empty string for null or undefined input', () => {
		expect(markdownToHtml(null)).toBe('');
		expect(markdownToHtml(undefined)).toBe('');
	});

	it('converts a heading', () => {
		expect(markdownToHtml('# Hello')).toBe('<h1>Hello</h1>\n');
	});

	it('converts bold text', () => {
		expect(markdownToHtml('**hi**')).toBe('<p><strong>hi</strong></p>\n');
	});

	it('converts a link', () => {
		expect(markdownToHtml('[Featurebase](https://featurebase.app)')).toBe('<p><a href="https://featurebase.app">Featurebase</a></p>\n');
	});

	it('converts an unordered list', () => {
		expect(markdownToHtml('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n');
	});
});

describe('htmlToText', () => {
	it('returns an empty string for null or undefined input', () => {
		expect(htmlToText(null)).toBe('');
		expect(htmlToText(undefined)).toBe('');
	});

	it('strips tags down to plain text', () => {
		expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('keeps link text but drops the href', () => {
		expect(htmlToText('<a href="https://featurebase.app">Featurebase</a>')).toBe('Featurebase');
	});

	it('skips images entirely', () => {
		expect(htmlToText('<p>before</p><img src="pic.png" alt="a picture" /><p>after</p>')).toBe('before\n\nafter');
	});

	it('removes script and style content', () => {
		expect(htmlToText('<style>.a{color:red}</style><script>alert(1)</script><p>visible</p>')).toBe('visible');
	});

	it('renders a list with bullet markers', () => {
		expect(htmlToText('<ul><li>one</li><li>two</li></ul>')).toBe('* one\n * two');
	});
});
