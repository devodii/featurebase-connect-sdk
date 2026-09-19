// This is the sdk's own build-time adapter, not the published n8n node, so a real
// dependency is fine; the root lint job runs npm ci (no pnpm workspace linking),
// so it cannot resolve this workspace package either.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, import-x/no-unresolved */
import { BaseAdapter, schemaBindingName, type CompilerContext } from '@featurebase-connect-sdk/cli';

class N8nAdapter extends BaseAdapter {
	generate(ctx: CompilerContext): void {
		this.writeOperationRegistry(ctx, `${ctx.outDir}/operations.ts`, 'n8nOperations');
		this.writeWebhookTopics(ctx, `${ctx.outDir}/webhookTopics.ts`, 'N8N_WEBHOOK_TOPICS', 'N8nWebhookTopic');

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
