// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { resolve } from 'path';
import { generateOperationRegistry } from './operations';
import { getOperation, loadOpenApi } from '../openapi/loader';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

function evaluate(expr: string): Record<string, { method: string; path: string }> {
	// eslint-disable-next-line @n8n/community-nodes/no-dangerous-functions
	return new Function(`return ${expr};`)() as Record<string, { method: string; path: string }>;
}

describe('generateOperationRegistry', () => {
	const document = loadOpenApi(SPEC_PATH);

	it('produces a valid object literal mapping operationId to method and path', () => {
		const operations = [getOperation(document, 'createPost'), getOperation(document, 'getPost'), getOperation(document, 'listBoards')];

		const registry = evaluate(generateOperationRegistry(operations));

		expect(registry).toEqual({
			createPost: { method: 'POST', path: '/v2/posts' },
			getPost: { method: 'GET', path: '/v2/posts/{id}' },
			listBoards: { method: 'GET', path: '/v2/boards' },
		});
	});

	it('produces an empty object literal for no operations', () => {
		expect(evaluate(generateOperationRegistry([]))).toEqual({});
	});
});
