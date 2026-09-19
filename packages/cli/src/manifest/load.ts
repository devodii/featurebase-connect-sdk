// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { parse } from 'yaml';
import type { OpenApiDocument } from '../openapi/loader';
import { ManifestSchema, type Manifest } from './schema';

export function loadManifest(manifestPath: string, document: OpenApiDocument): Manifest {
	const raw: unknown = parse(readFileSync(resolve(manifestPath), 'utf8'));
	const result = ManifestSchema.safeParse(raw);
	if (!result.success) {
		const issues = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ');
		throw new Error(`Invalid manifest at "${manifestPath}": ${issues}`);
	}

	const parsed = result.data;
	const operations = parsed.operations === '*' ? Object.keys(document.operations) : parsed.operations;

	const unknownOperations = operations.filter((operationId) => !(operationId in document.operations));
	if (unknownOperations.length > 0) {
		throw new Error(`Manifest at "${manifestPath}" references unknown operationId(s): ${unknownOperations.join(', ')}`);
	}

	return { name: parsed.name, adapter: parsed.adapter, outDir: parsed.outDir, operations };
}

export function resolveAdapterPath(manifestPath: string, manifest: Manifest): string {
	return resolve(dirname(resolve(manifestPath)), manifest.adapter);
}
