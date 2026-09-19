import type { Manifest } from '../manifest/schema';
import type { OpenApiDocument, OpenApiOperation } from '../openapi/loader';

export interface CompilerContext {
	document: OpenApiDocument;
	manifest: Manifest;
	operations: readonly OpenApiOperation[];
	outDir: string;
}

export interface IntegrationAdapter {
	generate(ctx: CompilerContext): void | Promise<void>;
}
