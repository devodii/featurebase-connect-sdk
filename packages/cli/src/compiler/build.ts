import { dirname, resolve } from '../platform';
import { loadManifest, resolveAdapterPath } from '../manifest/load';
import { getOperation, loadOpenApi } from '../openapi/loader';
import type { BaseAdapter } from './base-adapter';
import type { CompilerContext } from './types';

export interface BuildOptions {
	manifestPath: string;
	specPath: string;
	loadAdapter?: (adapterPath: string) => BaseAdapter;
}

let tsNodeRegistered = false;

// TypeScript adapters are the whole point (typed CompilerContext, autocomplete on
// ctx.operations, etc.), so require() must be able to load a .ts file directly.
function ensureTypeScriptSupport(adapterPath: string): void {
	if (tsNodeRegistered || !adapterPath.endsWith('.ts')) return;
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @n8n/community-nodes/no-restricted-imports
	require('ts-node').register({ transpileOnly: true });
	tsNodeRegistered = true;
}

const defaultLoadAdapter = (adapterPath: string): BaseAdapter => {
	ensureTypeScriptSupport(adapterPath);
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
