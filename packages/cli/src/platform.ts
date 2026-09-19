// The single place this package touches node builtins and third-party deps. Everything
// else imports from here instead of 'fs'/'path'/'ts-morph'/etc directly.
export { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs';
export { tmpdir } from 'os';
export { dirname, join, resolve } from 'path';
export { parse as parseYaml } from 'yaml';
export { zodToJsonSchema } from 'zod-to-json-schema';
export { Project, QuoteKind, VariableDeclarationKind } from 'ts-morph';
export type { ProjectOptions, SourceFile } from 'ts-morph';
