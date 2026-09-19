// This is a build-time cli tool, not n8n node code, so third-party deps are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { Project, QuoteKind, type ProjectOptions, VariableDeclarationKind, type SourceFile } from 'ts-morph';
import { generateOperationRegistry } from '../codegen/operations';
import { generateZodSchema, schemaBindingName } from '../codegen/zod';
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

	protected writeZodSchema(ctx: CompilerContext, filePath: string, schemaName: string, schema: JsonSchema): SourceFile {
		const sourceFile = this.createSourceFile(filePath);
		sourceFile.addImportDeclaration({ moduleSpecifier: 'zod', namedImports: ['z'] });
		sourceFile.addVariableStatement({
			isExported: true,
			declarationKind: VariableDeclarationKind.Const,
			declarations: [{ name: schemaBindingName(schemaName), initializer: generateZodSchema(ctx.document, schema, schemaName) }],
		});
		return sourceFile;
	}

	protected writeOperationRegistry(ctx: CompilerContext, filePath: string, constName: string): SourceFile {
		const sourceFile = this.createSourceFile(filePath);
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
