import { loadOpenApi, type OpenApiDocument } from '../openapi/loader';
import { createTempDir, removeTempDir, SPEC_PATH, writeFixture } from '../test-support';
import { loadManifest, resolveAdapterPath } from './load';

describe('loadManifest', () => {
	let dir: string;
	let document: OpenApiDocument;

	beforeAll(() => {
		document = loadOpenApi(SPEC_PATH);
	});

	beforeEach(() => {
		dir = createTempDir('featurebase-connect-manifest-');
	});

	afterEach(() => {
		removeTempDir(dir);
	});

	function writeManifest(contents: string): string {
		return writeFixture(dir, 'manifest.yaml', contents);
	}

	it('loads a valid manifest referencing real operationIds', () => {
		const manifestPath = writeManifest(`
name: n8n
adapter: ./mapper.ts
outDir: ../../integrations/n8n/generated
operations:
  - listBoards
  - createPost
`);

		const manifest = loadManifest(manifestPath, document);

		expect(manifest).toEqual({
			name: 'n8n',
			adapter: './mapper.ts',
			outDir: '../../integrations/n8n/generated',
			operations: ['listBoards', 'createPost'],
		});
	});

	it('ignores a leading yaml-language-server pragma comment, used for editor autocomplete', () => {
		const manifestPath = writeManifest(`# yaml-language-server: $schema=../../packages/cli/schema/manifest.schema.json
name: n8n
adapter: ./mapper.ts
outDir: ./generated
operations:
  - listBoards
`);

		const manifest = loadManifest(manifestPath, document);
		expect(manifest.name).toBe('n8n');
	});

	it('rejects a manifest missing a required field', () => {
		const manifestPath = writeManifest(`
adapter: ./mapper.ts
outDir: ./generated
operations:
  - listBoards
`);

		expect(() => loadManifest(manifestPath, document)).toThrow('name');
	});

	it('rejects a manifest with an empty operations list', () => {
		const manifestPath = writeManifest(`
name: n8n
adapter: ./mapper.ts
outDir: ./generated
operations: []
`);

		expect(() => loadManifest(manifestPath, document)).toThrow('operations');
	});

	it('expands operations: "*" to every operationId in the real spec', () => {
		const manifestPath = writeManifest(`
name: everything
adapter: ./mapper.ts
outDir: ./generated
operations: '*'
`);

		const manifest = loadManifest(manifestPath, document);

		expect(manifest.operations).toEqual(Object.keys(document.operations));
		expect(manifest.operations.length).toBeGreaterThan(50);
		expect(manifest.operations).toContain('createPost');
		expect(manifest.operations).toContain('listBoards');
	});

	it('rejects a manifest referencing an operationId that does not exist in the spec', () => {
		const manifestPath = writeManifest(`
name: n8n
adapter: ./mapper.ts
outDir: ./generated
operations:
  - listBoards
  - notARealOperation
`);

		expect(() => loadManifest(manifestPath, document)).toThrow('notARealOperation');
	});
});

describe('resolveAdapterPath', () => {
	it('resolves the adapter path relative to the manifest file, not the current working directory', () => {
		const manifestPath = '/integrations/n8n/manifest.yaml';
		const manifest = { name: 'n8n', adapter: './mapper.ts', outDir: './generated', operations: ['listBoards'] };

		expect(resolveAdapterPath(manifestPath, manifest)).toBe('/integrations/n8n/mapper.ts');
	});
});
