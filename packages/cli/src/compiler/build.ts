// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { dirname, resolve } from 'path';
import { loadManifest, resolveAdapterPath } from '../manifest/load';
import { getOperation, loadOpenApi } from '../openapi/loader';
import type { BaseAdapter } from './base-adapter';
import type { CompilerContext } from './types';

export interface BuildOptions {
	manifestPath: string;
	specPath: string;
	loadAdapter?: (adapterPath: string) => BaseAdapter;
}

const defaultLoadAdapter = (adapterPath: string): BaseAdapter => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const imported = require(adapterPath) as { default: BaseAdapter } | BaseAdapter;
	return 'generate' in imported ? imported : imported.default;
};

export async function build({ manifestPath, specPath, loadAdapter = defaultLoadAdapter }: BuildOptions): Promise<CompilerContext> {
	const document = loadOpenApi(specPath);
	const manifest = loadManifest(manifestPath, document);
	const adapter = loadAdapter(resolveAdapterPath(manifestPath, manifest));

	const ctx: CompilerContext = {
		document,
		manifest,
		operations: manifest.operations.map((operationId) => getOperation(document, operationId)),
		outDir: resolve(dirname(resolve(manifestPath)), manifest.outDir),
	};

	await adapter.generate(ctx);
	await adapter.save();

	return ctx;
}
