import { generateManifestJsonSchema, writeManifestJsonSchema } from './json-schema';
import { ManifestSchema } from './schema';
import { createTempDir, readFixture, removeTempDir, resolvePath } from '../test-support';

describe('generateManifestJsonSchema', () => {
	const jsonSchema = generateManifestJsonSchema();

	function definition(): Record<string, unknown> {
		const definitions = jsonSchema.definitions as Record<string, Record<string, unknown>>;
		return definitions.FeaturebaseConnectManifest;
	}

	it('marks every manifest field as required, matching the zod schema', () => {
		expect(definition().required).toEqual(['name', 'adapter', 'outDir', 'operations']);
	});

	it('rejects unknown properties, so a typo in a field name is caught by the editor', () => {
		expect(definition().additionalProperties).toBe(false);
	});

	it('models operations as either the literal "*" or a non-empty string array', () => {
		const properties = definition().properties as Record<string, unknown>;
		const operations = properties.operations as { anyOf: Record<string, unknown>[] };
		expect(operations.anyOf).toContainEqual(expect.objectContaining({ const: '*' }));
		expect(operations.anyOf).toContainEqual(expect.objectContaining({ type: 'array', minItems: 1 }));
	});

	it('stays in sync with the zod manifest schema for both valid and invalid manifests', () => {
		const valid = { name: 'n8n', adapter: './mapper.ts', outDir: './generated', operations: ['createPost'] };
		expect(ManifestSchema.safeParse(valid).success).toBe(true);

		const missingField = { adapter: './mapper.ts', outDir: './generated', operations: ['createPost'] };
		expect(ManifestSchema.safeParse(missingField).success).toBe(false);
	});
});

describe('writeManifestJsonSchema', () => {
	it('writes a valid, parseable JSON schema file to disk', () => {
		const dir = createTempDir('featurebase-connect-schema-');
		try {
			const outPath = resolvePath(dir, 'manifest.schema.json');
			writeManifestJsonSchema(outPath);

			const written = JSON.parse(readFixture(outPath));
			expect(written.$schema).toBe('http://json-schema.org/draft-07/schema#');
			expect(written.definitions.FeaturebaseConnectManifest.type).toBe('object');
		} finally {
			removeTempDir(dir);
		}
	});

	it('creates the parent directory when it does not exist yet', () => {
		const dir = createTempDir('featurebase-connect-schema-');
		try {
			const outPath = resolvePath(dir, 'nested', 'deeper', 'manifest.schema.json');
			writeManifestJsonSchema(outPath);
			expect(JSON.parse(readFixture(outPath)).$schema).toBeDefined();
		} finally {
			removeTempDir(dir);
		}
	});
});
