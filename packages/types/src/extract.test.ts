import type { components } from './generated/openapi';
import type { ExtractBody, ExtractResponse, OperationPath, OperationQuery } from './extract';
import type { Equal, Expect } from './test-utils';

export type _CreatePostBody = Expect<Equal<ExtractBody<'createPost'>, components['schemas']['CreatePostBody']>>;
export type _CreatePostResponse = Expect<Equal<ExtractResponse<'createPost'>, components['schemas']['Post']>>;
export type _ListBoardsBody = Expect<Equal<ExtractBody<'listBoards'>, never>>;

// deleteWebhook has no useful response body in this spec; only needs to compile.
export type _DeleteWebhookCompiles = ExtractResponse<'deleteWebhook'>;

// createPost has no path params: this must be never, not undefined, or callers could
// never omit it from an object type meant to require it conditionally on `extends never`.
export type _CreatePostHasNoPath = Expect<Equal<OperationPath<'createPost'>, never>>;
export type _GetPostRequiresIdPath = Expect<Equal<OperationPath<'getPost'>, { id: string }>>;
export type _ListBoardsHasNoQuery = Expect<Equal<OperationQuery<'listBoards'>, never>>;

describe('ExtractBody / ExtractResponse', () => {
	// The real assertions above are enforced at compile time; this gives them a runtime home.
	it('compiles the type-level assertions above', () => {
		expect(true).toBe(true);
	});
});
