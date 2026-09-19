import type { OpenApiOperation } from '../openapi/loader';

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function key(operationId: string): string {
	return IDENTIFIER.test(operationId) ? operationId : JSON.stringify(operationId);
}

export function generateOperationRegistry(operations: readonly OpenApiOperation[]): string {
	const entries = operations.map(
		(operation) => `${key(operation.operationId)}: { method: ${JSON.stringify(operation.method)}, path: ${JSON.stringify(operation.path)} }`,
	);
	return `{ ${entries.join(', ')} }`;
}
