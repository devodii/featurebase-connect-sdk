import { generateOperationRegistry } from './operations';
import { getOperation, loadOpenApi } from '../openapi/loader';
import { evalModule, SPEC_PATH } from '../test-support';

function evaluate(expr: string): Record<string, { method: string; path: string }> {
	return evalModule(`return ${expr};`);
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
