import { extractErrorMessage, FeaturebaseApiError } from './errors';

// Fixtures below are the exact, real response bodies observed by hitting the
// live Featurebase API directly (see reference/FINDINGS.md §4) - not invented.

const NOT_FOUND_BODY = {
	error: { type: 'invalid_request_error', code: 'resource_not_found', message: 'Post not found', param: 'post' },
};

const FLAT_VALIDATION_BODY = {
	code: 400,
	message: 'Validation error: body.title: String must contain at least 2 character(s)',
};

const AUTH_FAILURE_BODY = { success: false, message: 'Invalid API Key' };

describe('extractErrorMessage', () => {
	it('reads the documented error.message envelope (404 NotFoundError shape)', () => {
		expect(extractErrorMessage(NOT_FOUND_BODY)).toBe('Post not found');
	});

	it('reads a flat top-level message (real createPost 400 shape)', () => {
		expect(extractErrorMessage(FLAT_VALIDATION_BODY)).toBe('Validation error: body.title: String must contain at least 2 character(s)');
	});

	it('reads a flat top-level message (real 401 invalid API key shape)', () => {
		expect(extractErrorMessage(AUTH_FAILURE_BODY)).toBe('Invalid API Key');
	});

	it('returns undefined when neither shape matches', () => {
		expect(extractErrorMessage({ nothing: 'useful' })).toBeUndefined();
		expect(extractErrorMessage(undefined)).toBeUndefined();
		expect(extractErrorMessage(null)).toBeUndefined();
		expect(extractErrorMessage('a string body')).toBeUndefined();
	});
});

describe('FeaturebaseApiError', () => {
	it('uses the 404 envelope message and shapes .response for retry detection', () => {
		const error = new FeaturebaseApiError(404, NOT_FOUND_BODY, { 'x-request-id': 'abc' });

		expect(error.name).toBe('FeaturebaseApiError');
		expect(error.message).toBe('Post not found');
		expect(error.status).toBe(404);
		expect(error.body).toBe(NOT_FOUND_BODY);
		expect(error.response).toEqual({ status: 404, headers: { 'x-request-id': 'abc' }, body: NOT_FOUND_BODY });
	});

	it('uses the flat 400 message', () => {
		const error = new FeaturebaseApiError(400, FLAT_VALIDATION_BODY);

		expect(error.message).toBe('Validation error: body.title: String must contain at least 2 character(s)');
		expect(error.response).toEqual({ status: 400, headers: {}, body: FLAT_VALIDATION_BODY });
	});

	it('uses the 401 message', () => {
		const error = new FeaturebaseApiError(401, AUTH_FAILURE_BODY);

		expect(error.message).toBe('Invalid API Key');
	});

	it('falls back to a generic message when the body matches no known shape', () => {
		const error = new FeaturebaseApiError(500, { unexpected: true });

		expect(error.message).toBe('Featurebase API request failed with status 500');
	});
});
