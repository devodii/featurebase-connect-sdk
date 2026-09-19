import { BaseAdapter, schemaBindingName, type CompilerContext } from '@featurebase-connect-sdk/cli';

class N8nAdapter extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		const registry = this.writeOperationRegistry(ctx, `${ctx.outDir}/operations.ts`, 'n8nOperations');
		// This lives in the same repo as the n8n community node, whose root lint config scans
		// the whole tree; it flags this workspace-package import even though it's not node code.
		registry.insertText(0, '/* eslint-disable @n8n/community-nodes/no-restricted-imports */\n');

		const schemaOperations = ctx.operations.filter((operation) => operation.requestBodySchema);
		for (const operation of schemaOperations) {
			this.writeZodSchema(ctx, `${ctx.outDir}/schemas/${operation.operationId}.ts`, operation.operationId, operation.requestBodySchema!);
		}

		const registryFile = this.createSourceFile(`${ctx.outDir}/schemas/index.ts`);
		for (const operation of schemaOperations) {
			registryFile.addImportDeclaration({ moduleSpecifier: `./${operation.operationId}`, namedImports: [schemaBindingName(operation.operationId)] });
		}
		registryFile.addImportDeclaration({ moduleSpecifier: 'zod', namedImports: [{ name: 'ZodTypeAny', isTypeOnly: true }] });

		const entries = schemaOperations.map((operation) => `${operation.operationId}: ${schemaBindingName(operation.operationId)}`);
		registryFile.addStatements(`export const n8nSchemas: Record<string, ZodTypeAny> = { ${entries.join(', ')} };`);
	}
}

export default new N8nAdapter();
