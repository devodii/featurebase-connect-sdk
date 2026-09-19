#!/usr/bin/env node
// This is the cli entrypoint: printing to the terminal and reading argv/exit code
// are the whole point, not n8n node behavior.
/* eslint-disable no-console, @n8n/community-nodes/no-restricted-globals */
import { resolve } from '../platform';
import { build } from '../compiler/build';

async function main(): Promise<void> {
	const [manifestArg, specArg] = process.argv.slice(2);
	if (!manifestArg) {
		console.error('Usage: featurebase-connect <manifest.yaml> [openapi.json]');
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
