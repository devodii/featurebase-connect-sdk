// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { loadOpenApi, type OpenApiDocument } from '../openapi/loader';
import { loadManifest, resolveAdapterPath } from './load';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

describe('loadManifest', () => {
	let dir: string;
	let document: OpenApiDocument;

	beforeAll(() => {
		document = loadOpenApi(SPEC_PATH);
	});

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'featurebase-connect-manifest-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	function writeManifest(contents: string): string {
		const manifestPath = join(dir, 'manifest.yaml');
		writeFileSync(manifestPath, contents);
		return manifestPath;
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
