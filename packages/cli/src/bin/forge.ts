#!/usr/bin/env node
// This is a build-time cli tool, not n8n node code, so node builtins/console are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals, no-console */
import { resolve } from 'path';
import { build } from '../compiler/build';

async function main(): Promise<void> {
	const [manifestArg, specArg] = process.argv.slice(2);
	if (!manifestArg) {
		console.error('Usage: forge <manifest.yaml> [openapi.json]');
		process.exitCode = 1;
		return;
	}

	const ctx = await build({
		manifestPath: resolve(manifestArg),
		specPath: resolve(specArg ?? 'reference/openapi.json'),
	});

	console.log(`Generated ${ctx.operations.length} operation(s) for "${ctx.manifest.name}" into ${ctx.outDir}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
