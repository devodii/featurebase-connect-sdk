import { htmlToText } from '../../nodes/Featurebase/utils/html';

describe('htmlToText', () => {
	it('returns an empty string for empty input', () => {
		expect(htmlToText('')).toBe('');
	});

	it('strips tags', () => {
		expect(htmlToText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
	});

	it('decodes common HTML entities', () => {
		expect(htmlToText('Tom &amp; Jerry &lt;3&gt;')).toBe('Tom & Jerry <3>');
	});

	it('decodes numeric entities', () => {
		expect(htmlToText('&#65;&#x42;')).toBe('AB');
	});

	it('converts <br> and block tags to line breaks', () => {
		expect(htmlToText('<p>one</p><p>two</p>')).toBe('one\ntwo');
		expect(htmlToText('one<br>two')).toBe('one\ntwo');
	});

	it('collapses repeated whitespace', () => {
		expect(htmlToText('<p>a   b</p>')).toBe('a b');
	});

	it('trims leading and trailing whitespace', () => {
		expect(htmlToText('  <p>padded</p>  ')).toBe('padded');
	});
});
