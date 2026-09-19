// __dirname here resolves this test file's own sibling modules for the adapter fixtures below.
/* eslint-disable @n8n/community-nodes/no-restricted-globals */
import { build } from './build';
import { createTempDir, readFixture, removeTempDir, resolvePath, SPEC_PATH, writeFixture } from '../test-support';

describe('build', () => {
	let dir: string;

	beforeEach(() => {
		dir = createTempDir('featurebase-connect-build-');
	});

	afterEach(() => {
		removeTempDir(dir);
	});

	it('loads the manifest, invokes the adapter, and writes generated files to disk', async () => {
		writeFixture(
			dir,
			'manifest.yaml',
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - createPost
`,
		);

		writeFixture(
			dir,
			'mapper.js',
			`
const { BaseAdapter } = require('${resolvePath(__dirname, 'base-adapter')}');

class TestMapper extends BaseAdapter {
	generate(ctx) {
		this.writeZodSchema(ctx, ctx.outDir + '/CreatePostBody.ts', 'CreatePostBody', ctx.document.schemas.CreatePostBody);
	}
}

module.exports.default = new TestMapper();
`,
		);

		const ctx = await build({ manifestPath: resolvePath(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		expect(ctx.manifest.name).toBe('test-integration');
		expect(ctx.operations).toHaveLength(1);
		expect(ctx.operations[0].operationId).toBe('createPost');

		const contents = readFixture(resolvePath(dir, 'generated', 'CreatePostBody.ts'));
		expect(contents).toContain('export const CreatePostBodySchema');
	});

	it('supports an adapter that exports itself directly instead of via .default', async () => {
		writeFixture(
			dir,
			'manifest.yaml',
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - listBoards
`,
		);

		writeFixture(
			dir,
			'mapper.js',
			`
const { BaseAdapter } = require('${resolvePath(__dirname, 'base-adapter')}');

class TestMapper extends BaseAdapter {
	generate(ctx) {
		this.createSourceFile(ctx.outDir + '/marker.ts').addStatements('export const marker = true;');
	}
}

module.exports = new TestMapper();
`,
		);

		await build({ manifestPath: resolvePath(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		const contents = readFixture(resolvePath(dir, 'generated', 'marker.ts'));
		expect(contents).toContain('export const marker = true;');
	});

	it('loads a TypeScript adapter directly, so authors get real types and autocomplete', async () => {
		writeFixture(
			dir,
			'manifest.yaml',
			`
name: test-integration
adapter: ./mapper.ts
outDir: ./generated
operations:
  - createPost
`,
		);

		writeFixture(
			dir,
			'mapper.ts',
			`
import { BaseAdapter } from '${resolvePath(__dirname, 'base-adapter')}';
import type { CompilerContext } from '${resolvePath(__dirname, 'types')}';

class TestMapper extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		this.createSourceFile(ctx.outDir + '/marker.ts').addStatements('export const marker = true;');
	}
}

export default new TestMapper();
`,
		);

		await build({ manifestPath: resolvePath(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		const contents = readFixture(resolvePath(dir, 'generated', 'marker.ts'));
		expect(contents).toContain('export const marker = true;');
	});

	it('builds every operation in the real spec when the manifest asks for "*"', async () => {
		writeFixture(
			dir,
			'manifest.yaml',
			`
name: everything
adapter: ./mapper.js
outDir: ./generated
operations: '*'
`,
		);
		writeFixture(dir, 'mapper.js', `module.exports.default = { generate() {}, save() {} };`);

		const ctx = await build({ manifestPath: resolvePath(dir, 'manifest.yaml'), specPath: SPEC_PATH });

		expect(ctx.operations.length).toBeGreaterThan(50);
		expect(ctx.operations.map((operation) => operation.operationId)).toContain('createPost');
	});

	it('rejects a manifest that references an unknown operationId before touching the adapter', async () => {
		writeFixture(
			dir,
			'manifest.yaml',
			`
name: test-integration
adapter: ./mapper.js
outDir: ./generated
operations:
  - notARealOperation
`,
		);
		writeFixture(dir, 'mapper.js', `module.exports.default = { generate() { throw new Error('should not run'); } };`);

		await expect(build({ manifestPath: resolvePath(dir, 'manifest.yaml'), specPath: SPEC_PATH })).rejects.toThrow('notARealOperation');
	});
});
