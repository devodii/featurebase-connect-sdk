import type { components } from './generated/openapi';
import type { ExtractBody, ExtractResponse } from './extract';
import type { Equal, Expect } from './test-utils';

export type _CreatePostBody = Expect<Equal<ExtractBody<'createPost'>, components['schemas']['CreatePostBody']>>;
export type _CreatePostResponse = Expect<Equal<ExtractResponse<'createPost'>, components['schemas']['Post']>>;
export type _ListBoardsBody = Expect<Equal<ExtractBody<'listBoards'>, never>>;

// deleteWebhook has no useful response body in this spec; only needs to compile.
export type _DeleteWebhookCompiles = ExtractResponse<'deleteWebhook'>;

describe('ExtractBody / ExtractResponse', () => {
	// The real assertions above are enforced at compile time; this gives them a runtime home.
	it('compiles the type-level assertions above', () => {
		expect(true).toBe(true);
	});
});
