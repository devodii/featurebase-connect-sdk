import { createHmac } from 'crypto';

import { hmacSha256Hex, verifyHmacSha256 } from '../../nodes/Featurebase/utils/hmac';

describe('hmacSha256Hex', () => {
	it('matches a manually computed HMAC-SHA256 hex digest', () => {
		const expected = createHmac('sha256', 'my-secret').update('payload', 'utf8').digest('hex');
		expect(hmacSha256Hex('payload', 'my-secret')).toBe(expected);
	});

	it('strips a whsec_ prefix from the secret before signing', () => {
		const expected = createHmac('sha256', 'raw-secret').update('payload', 'utf8').digest('hex');
		expect(hmacSha256Hex('payload', 'whsec_raw-secret')).toBe(expected);
	});
});

describe('verifyHmacSha256', () => {
	it('returns true for a matching signature', () => {
		const signature = hmacSha256Hex('payload', 'whsec_secret');
		expect(verifyHmacSha256('payload', 'whsec_secret', signature)).toBe(true);
	});

	it('returns false for a mismatched signature', () => {
		expect(verifyHmacSha256('payload', 'whsec_secret', 'deadbeef')).toBe(false);
	});

	it('returns false when the payload has changed', () => {
		const signature = hmacSha256Hex('original', 'whsec_secret');
		expect(verifyHmacSha256('tampered', 'whsec_secret', signature)).toBe(false);
	});

	it('tolerates surrounding whitespace in the header value', () => {
		const signature = hmacSha256Hex('payload', 'whsec_secret');
		expect(verifyHmacSha256('payload', 'whsec_secret', `  ${signature}  `)).toBe(true);
	});
});
