import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const REF_PREFIX = '#/components/schemas/';

const rootDir = dirname(fileURLToPath(import.meta.url));
const specPath = join(rootDir, '..', '..', '..', 'reference', 'openapi.json');
const outPath = join(rootDir, '..', 'src', 'generated', 'schema-registry.ts');

const spec = JSON.parse(await readFile(specPath, 'utf8'));

const entries = [];
for (const methods of Object.values(spec.paths ?? {})) {
	for (const method of HTTP_METHODS) {
		const definition = methods[method];
		if (!definition?.operationId) continue;

		const ref = definition.requestBody?.content?.['application/json']?.schema?.$ref;
		if (!ref?.startsWith(REF_PREFIX)) continue;

		entries.push({ operationId: definition.operationId, schemaName: ref.slice(REF_PREFIX.length) });
	}
}

entries.sort((a, b) => a.operationId.localeCompare(b.operationId));

const lines = entries.map(({ operationId, schemaName }) => `\t${JSON.stringify(operationId)}: { body: schemas.${schemaName} },`);

const output = `// Auto-generated from reference/openapi.json by scripts/generate-schema-registry.mjs. Do not edit by hand.
import { defineSchemas } from '../registry';
import { schemas } from './schemas';

export const generatedSchemas = defineSchemas({
${lines.join('\n')}
});
`;

await writeFile(outPath, output, 'utf8');
console.log(`Generated ${entries.length} body schema bindings -> ${outPath}`);
