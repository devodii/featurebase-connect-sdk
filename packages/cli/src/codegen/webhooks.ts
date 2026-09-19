export function generateWebhookTopics(topics: readonly string[], constName: string, typeName: string): string {
	const list = topics.map((topic) => JSON.stringify(topic)).join(', ');
	return [
		`export const ${constName} = [${list}] as const;`,
		`export type ${typeName} = (typeof ${constName})[number];`,
		`export const ${typeName}Schema = z.enum(${constName});`,
	].join('\n');
}
