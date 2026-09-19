// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { resolve } from 'path';
import { getOperation, getSchema, loadOpenApi } from './loader';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

describe('loadOpenApi', () => {
	const document = loadOpenApi(SPEC_PATH);

	it('indexes every named schema', () => {
		const post = getSchema(document, 'Post');
		expect(post.properties?.title).toBeDefined();
		expect(post.properties?.id).toBeDefined();
	});

	it('indexes operations by operationId, not by path', () => {
		const createPost = getOperation(document, 'createPost');
		expect(createPost.method).toBe('POST');
		expect(createPost.path).toBe('/v2/posts');
	});

	it('resolves a $ref request body to the real schema, not a pointer', () => {
		const createPost = getOperation(document, 'createPost');
		expect(createPost.requestBodySchema?.$ref).toBeUndefined();
		expect(createPost.requestBodySchema?.properties?.boardId).toBeDefined();
		expect(createPost.requestBodySchema?.required).toContain('title');
	});

	it('has no request body for a GET operation', () => {
		const listBoards = getOperation(document, 'listBoards');
		expect(listBoards.requestBodySchema).toBeUndefined();
	});

	it('resolves the success response schema', () => {
		const createPost = getOperation(document, 'createPost');
		expect(createPost.successResponseSchema?.properties?.slug).toBeDefined();
	});

	it('throws a clear error for an unknown schema name', () => {
		expect(() => getSchema(document, 'DoesNotExist')).toThrow('DoesNotExist');
	});
});
