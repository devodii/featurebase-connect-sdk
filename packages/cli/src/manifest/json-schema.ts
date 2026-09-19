// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ManifestSchema } from './schema';

/** A JSON Schema for manifest.yaml, so editors (via the yaml-language-server pragma) can validate and autocomplete it. */
export function generateManifestJsonSchema(): Record<string, unknown> {
	// zodToJsonSchema's generic signature recurses too deeply against ManifestSchema's exact
	// type for tsc to resolve (a known zod/zod-to-json-schema TS interaction, not a real bug);
	// the cast only affects this call's type-checking, not the runtime schema it returns.
	return zodToJsonSchema(ManifestSchema as never, { name: 'FeaturebaseConnectManifest', $refStrategy: 'none' }) as Record<string, unknown>;
}

export function writeManifestJsonSchema(outPath: string): void {
	const resolvedPath = resolve(outPath);
	mkdirSync(dirname(resolvedPath), { recursive: true });
	// Tab-indented to match this repo's prettier config, so a regeneration never drifts from prettier --check.
	writeFileSync(resolvedPath, `${JSON.stringify(generateManifestJsonSchema(), null, '\t')}\n`);
}
