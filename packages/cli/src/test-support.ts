// Shared test helpers so individual test files don't each need their own __dirname
// reference or their own "yes, we really do want to eval generated code" exception.
/* eslint-disable @n8n/community-nodes/no-restricted-globals, @n8n/community-nodes/no-dangerous-functions */
import { join, mkdtempSync, readFileSync, resolve, rmSync, tmpdir, writeFileSync } from './platform';

export const SPEC_PATH = resolve(__dirname, '../../../reference/openapi.json');

export { resolve as resolvePath };

export function createTempDir(prefix: string): string {
	return mkdtempSync(join(tmpdir(), prefix));
}

export function removeTempDir(dir: string): void {
	rmSync(dir, { recursive: true, force: true });
}

export function writeFixture(dir: string, name: string, contents: string): string {
	const path = join(dir, name);
	writeFileSync(path, contents);
	return path;
}

export function readFixture(path: string): string {
	return readFileSync(path, 'utf8');
}

/** Evaluates a generated code string with the given globals in scope, the way the compiler's emitted file would run it. */
export function evalModule<T>(script: string, globals: Record<string, unknown> = {}): T {
	const names = Object.keys(globals);
	const values = Object.values(globals);
	return new Function(...names, script)(...values) as T;
}
