// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { build } from './build';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

describe('build', () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'featurebase-connect-build-'));
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it('loads the manifest, invokes the adapter, and writes generated files to disk', async () => {
		writeFileSync(
			join(dir, 'manifest.yaml'),
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - createPost
`,
		);

		writeFileSync(
			join(dir, 'mapper.js'),
			`
const { BaseAdapter } = require('${resolve(__dirname, 'base-adapter')}');

class TestMapper extends BaseAdapter {
	generate(ctx) {
		this.writeZodSchema(ctx, ctx.outDir + '/CreatePostBody.ts', 'CreatePostBody', ctx.document.schemas.CreatePostBody);
	}
}

module.exports.default = new TestMapper();
`,
		);

		const ctx = await build({ manifestPath: join(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		expect(ctx.manifest.name).toBe('test-integration');
		expect(ctx.operations).toHaveLength(1);
		expect(ctx.operations[0].operationId).toBe('createPost');

		const generatedPath = join(dir, 'generated', 'CreatePostBody.ts');
		const contents = readFileSync(generatedPath, 'utf8');
		expect(contents).toContain('export const CreatePostBodySchema');
	});

	it('supports an adapter that exports itself directly instead of via .default', async () => {
		writeFileSync(
			join(dir, 'manifest.yaml'),
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - listBoards
`,
		);

		writeFileSync(
			join(dir, 'mapper.js'),
			`
const { BaseAdapter } = require('${resolve(__dirname, 'base-adapter')}');

class TestMapper extends BaseAdapter {
	generate(ctx) {
		this.createSourceFile(ctx.outDir + '/marker.ts').addStatements('export const marker = true;');
	}
}

module.exports = new TestMapper();
`,
		);

		await build({ manifestPath: join(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		const contents = readFileSync(join(dir, 'generated', 'marker.ts'), 'utf8');
		expect(contents).toContain('export const marker = true;');
	});

	it('loads a TypeScript adapter directly, so authors get real types and autocomplete', async () => {
		writeFileSync(
			join(dir, 'manifest.yaml'),
			`
name: test-integration
adapter: ./mapper.ts
outDir: ./generated
operations:
  - createPost
`,
		);

		writeFileSync(
			join(dir, 'mapper.ts'),
			`
import { BaseAdapter } from '${resolve(__dirname, 'base-adapter')}';
import type { CompilerContext } from '${resolve(__dirname, 'types')}';

class TestMapper extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		this.createSourceFile(ctx.outDir + '/marker.ts').addStatements('export const marker = true;');
	}
}

export default new TestMapper();
`,
		);

		await build({ manifestPath: join(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		const contents = readFileSync(join(dir, 'generated', 'marker.ts'), 'utf8');
		expect(contents).toContain('export const marker = true;');
	});

	it('builds every operation in the real spec when the manifest asks for "*"', async () => {
		writeFileSync(
			join(dir, 'manifest.yaml'),
			`
name: everything
adapter: ./mapper.js
outDir: ./generated
operations: '*'
`,
		);
		writeFileSync(join(dir, 'mapper.js'), `module.exports.default = { generate() {}, save() {} };`);

		const ctx = await build({ manifestPath: join(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		expect(ctx.operations.length).toBeGreaterThan(50);
		expect(ctx.operations.map((operation) => operation.operationId)).toContain('createPost');
	});

	it('rejects a manifest that references an unknown operationId before touching the adapter', async () => {
		writeFileSync(
			join(dir, 'manifest.yaml'),
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - notARealOperation
`,
		);
		writeFileSync(join(dir, 'mapper.js'), `module.exports.default = { generate() { throw new Error('should not run'); } };`);

		await expect(build({ manifestPath: join(dir, 'manifest.yaml'), specPath: SPEC_PATH })).rejects.toThrow('notARealOperation');
	});
});
