import type { components } from './generated/openapi';
import type { ExtractBody, ExtractResponse } from './extract';
import type { Equal, Expect } from './test-utils';

// createPost has a request body and a 201 response.
export type _CreatePostBody = Expect<Equal<ExtractBody<'createPost'>, components['schemas']['CreatePostBody']>>;
export type _CreatePostResponse = Expect<Equal<ExtractResponse<'createPost'>, components['schemas']['Post']>>;

// listBoards is a GET with no body.
export type _ListBoardsBody = Expect<Equal<ExtractBody<'listBoards'>, never>>;

// deleteWebhook returns a 204 with no useful body content in this spec's
// modeling, so this only needs to compile, not equal anything specific.
export type _DeleteWebhookCompiles = ExtractResponse<'deleteWebhook'>;

describe('ExtractBody / ExtractResponse', () => {
	it('compiles the type-level assertions above', () => {
		// The assertions are enforced at compile time; this just gives the
		// type-only checks a runtime home so `jest` reports them as a test.
		expect(true).toBe(true);
	});
});
