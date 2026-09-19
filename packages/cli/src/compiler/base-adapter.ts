import { Project, QuoteKind, type ProjectOptions, VariableDeclarationKind, type SourceFile } from '../platform';
import { generateOperationRegistry } from '../codegen/operations';
import { generateWebhookTopics } from '../codegen/webhooks';
import { generateZodSchema, schemaBindingName, schemaTypeName } from '../codegen/zod';
import type { JsonSchema } from '../openapi/schema';
import type { CompilerContext, IntegrationAdapter } from './types';

export function createProject(options: ProjectOptions = {}): Project {
	return new Project({
		skipAddingFilesFromTsConfig: true,
		...options,
		manipulationSettings: { quoteKind: QuoteKind.Single, ...options.manipulationSettings },
	});
}

export abstract class BaseAdapter implements IntegrationAdapter {
	protected readonly project: Project;

	constructor(project: Project = createProject()) {
		this.project = project;
	}

	protected createSourceFile(filePath: string): SourceFile {
		return this.project.createSourceFile(filePath, '', { overwrite: true });
	}

	/** Writes a zod schema paired with its inferred TypeScript type, so consumers get both runtime validation and a static type from one source of truth. */
	protected writeZodSchema(ctx: CompilerContext, filePath: string, schemaName: string, schema: JsonSchema): SourceFile {
		const sourceFile = this.createSourceFile(filePath);
		sourceFile.addImportDeclaration({ moduleSpecifier: 'zod', namedImports: ['z'] });
		const binding = schemaBindingName(schemaName);
		sourceFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [{ name: binding, initializer: generateZodSchema(ctx.document, schema, schemaName) }],
		});
		sourceFile.addTypeAlias({ isExported: true, name: schemaTypeName(schemaName), type: `z.infer<typeof ${binding}>` });
		return sourceFile;
	}

	/** Writes every named component schema in the spec, plus a barrel that re-exports all of them. */
	protected writeAllSchemas(ctx: CompilerContext, dirPath: string): SourceFile[] {
		const names = Object.keys(ctx.document.schemas).sort();
		const files = names.map((name) => this.writeZodSchema(ctx, `${dirPath}/${name}.ts`, name, ctx.document.schemas[name]));

		const barrel = this.createSourceFile(`${dirPath}/index.ts`);
		for (const name of names) {
			barrel.addExportDeclaration({ moduleSpecifier: `./${name}` });
		}
		return [...files, barrel];
	}

	protected writeWebhookTopics(ctx: CompilerContext, filePath: string, constName: string, typeName: string): SourceFile {
		const sourceFile = this.createSourceFile(filePath);
		sourceFile.addImportDeclaration({ moduleSpecifier: 'zod', namedImports: ['z'] });
		sourceFile.addStatements(generateWebhookTopics(ctx.document.webhookTopics, constName, typeName));
		return sourceFile;
	}

	/**
	 * Writes a runtime operation registry. This file imports `@featurebase-connect-sdk/core`,
	 * a real cross-package dependency, so any integration living in this monorepo needs this
	 * disable comment for the root n8n package's lint job, which scans the whole repository
	 * tree rather than just the published node code.
	 */
	protected writeOperationRegistry(ctx: CompilerContext, filePath: string, constName: string): SourceFile {
		const sourceFile = this.createSourceFile(filePath);
		sourceFile.insertText(0, '/* eslint-disable @n8n/community-nodes/no-restricted-imports, import-x/no-unresolved */\n');
		sourceFile.addImportDeclaration({
			moduleSpecifier: '@featurebase-connect-sdk/core',
			namedImports: [{ name: 'OperationDescriptor', isTypeOnly: true }],
		});
		sourceFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [{ name: constName, type: 'Record<string, OperationDescriptor>', initializer: generateOperationRegistry(ctx.operations) }],
		});
		return sourceFile;
	}

	async save(): Promise<void> {
		this.project.getSourceFiles().forEach((sourceFile) => sourceFile.formatText());
		await this.project.save();
	}

	abstract generate(ctx: CompilerContext): void | Promise<void>;
}
