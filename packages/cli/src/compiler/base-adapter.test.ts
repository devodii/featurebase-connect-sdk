// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { getOperation, loadOpenApi, getSchema, type OpenApiDocument } from '../openapi/loader';
import { BaseAdapter, createProject } from './base-adapter';
import type { CompilerContext } from './types';
import { resolve } from 'path';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

class TestAdapter extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		this.writeZodSchema(ctx, 'CreatePostBody.ts', 'CreatePostBody', getSchema(ctx.document, 'CreatePostBody'));
	}
}

class RegistryAdapter extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		this.writeOperationRegistry(ctx, 'operations.ts', 'operations');
	}
}

function fakeContext(document: OpenApiDocument, operations: CompilerContext['operations'] = []): CompilerContext {
	return { document, manifest: { name: 'test', adapter: './mapper.ts', outDir: './out', operations: [] }, operations, outDir: '/out' };
}

describe('BaseAdapter', () => {
	let document: OpenApiDocument;

	beforeAll(() => {
		document = loadOpenApi(SPEC_PATH);
	});

	it('writes a schema file exporting a valid zod schema constant', async () => {
		const project = createProject({ useInMemoryFileSystem: true });
		const adapter = new TestAdapter(project);

		adapter.generate(fakeContext(document));
		await adapter.save();

		const written = project.getFileSystem().readFileSync('CreatePostBody.ts');
		expect(written).toContain("import { z } from 'zod'");
		expect(written).toContain('export const CreatePostBodySchema = z.object(');
		expect(written).toContain('.strict()');
	});

	it('never touches the real file system when given an in-memory project', async () => {
		const project = createProject({ useInMemoryFileSystem: true });
		const adapter = new TestAdapter(project);

		adapter.generate(fakeContext(document));
		await adapter.save();

		expect(project.getFileSystem().fileExistsSync('CreatePostBody.ts')).toBe(true);
	});

	it('writes an operation registry mapping operationId to method and path', async () => {
		const project = createProject({ useInMemoryFileSystem: true });
		const adapter = new RegistryAdapter(project);
		const operations = [getOperation(document, 'createPost'), getOperation(document, 'getPost')];

		adapter.generate(fakeContext(document, operations));
		await adapter.save();

		const written = project.getFileSystem().readFileSync('operations.ts');
		expect(written).toContain("import { type OperationDescriptor } from '@featurebase-connect-sdk/core'");
		expect(written).toContain('export const operations: Record<string, OperationDescriptor>');
		expect(written).toContain('createPost: { method: "POST", path: "/v2/posts" }');
		expect(written).toContain('getPost: { method: "GET", path: "/v2/posts/{id}" }');
	});
});
