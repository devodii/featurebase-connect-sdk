// This is a build-time cli tool, not n8n node code, so third-party deps are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { Project, QuoteKind, type ProjectOptions, VariableDeclarationKind, type SourceFile } from 'ts-morph';
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

	async save(): Promise<void> {
		this.project.getSourceFiles().forEach((sourceFile) => sourceFile.formatText());
		await this.project.save();
	}

	abstract generate(ctx: CompilerContext): void | Promise<void>;
}
