import { createHmac, timingSafeEqual } from 'crypto';

function stripSecretPrefix(secret: string): string {
	return secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret;
}

export function hmacSha256Hex(payload: string, secret: string): string {
	return createHmac('sha256', stripSecretPrefix(secret)).update(payload, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of a computed signature against a header value.
 * Featurebase's docs don't publish the exact signature header name, so this
 * accepts a raw hex digest and lets the caller try the header names it
 * knows about.
 */
export function verifyHmacSha256(payload: string, secret: string, signature: string): boolean {
	const expected = hmacSha256Hex(payload, secret);
	const expectedBuffer = Buffer.from(expected, 'utf8');
	const actualBuffer = Buffer.from(signature.trim(), 'utf8');

	if (expectedBuffer.length !== actualBuffer.length) return false;
	return timingSafeEqual(expectedBuffer, actualBuffer);
}
