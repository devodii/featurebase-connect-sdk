import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

const rootDir = dirname(fileURLToPath(import.meta.url));
const specPath = join(rootDir, '..', '..', '..', 'reference', 'openapi.json');
const outPath = join(rootDir, '..', 'src', 'generated', 'operations.ts');

const spec = JSON.parse(await readFile(specPath, 'utf8'));

const entries = [];
for (const [path, methods] of Object.entries(spec.paths ?? {})) {
	for (const method of HTTP_METHODS) {
		const definition = methods[method];
		if (!definition?.operationId) continue;
		entries.push({ operationId: definition.operationId, method: method.toUpperCase(), path });
	}
}

entries.sort((a, b) => a.operationId.localeCompare(b.operationId));

const lines = entries.map(
	({ operationId, method, path }) => `\t${JSON.stringify(operationId)}: { method: ${JSON.stringify(method)}, path: ${JSON.stringify(path)} },`,
);

const output = `// Auto-generated from reference/openapi.json by scripts/generate-operations.mjs. Do not edit by hand.
import type { OperationRegistry } from '../client';

export const operationRegistry: OperationRegistry = {
${lines.join('\n')}
};
`;

await writeFile(outPath, output, 'utf8');
console.log(`Generated ${entries.length} operation descriptors -> ${outPath}`);
