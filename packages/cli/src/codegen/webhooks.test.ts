// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { resolve } from 'path';
import { z } from 'zod';
import { loadOpenApi } from '../openapi/loader';
import { generateWebhookTopics } from './webhooks';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

function evaluate(expr: string): { WEBHOOK_TOPICS: readonly string[]; WebhookTopicSchema: z.ZodTypeAny } {
	// The real generated file is TypeScript (export statements, a `type` alias), but
	// `Function` only runs plain JS, so strip everything that isn't runtime code.
	const script = expr
		.split('\n')
		.filter((line) => !line.startsWith('export type'))
		.map((line) => line.replace(/^export /, '').replace(/ as const;$/, ';'))
		.join('\n');
	// eslint-disable-next-line @n8n/community-nodes/no-dangerous-functions
	return new Function('z', `${script}\nreturn { WEBHOOK_TOPICS, WebhookTopicSchema };`)(z) as {
		WEBHOOK_TOPICS: readonly string[];
		WebhookTopicSchema: z.ZodTypeAny;
	};
}

describe('generateWebhookTopics', () => {
	const document = loadOpenApi(SPEC_PATH);

	it('generates a const array, a derived union type, and a matching zod enum from the real spec', () => {
		const expr = generateWebhookTopics(document.webhookTopics, 'WEBHOOK_TOPICS', 'WebhookTopic');
		const { WEBHOOK_TOPICS, WebhookTopicSchema } = evaluate(expr);

		expect(WEBHOOK_TOPICS).toEqual(document.webhookTopics);
		expect(WebhookTopicSchema.safeParse('post.created').success).toBe(true);
		expect(WebhookTopicSchema.safeParse('not.a.real.topic').success).toBe(false);
	});

	it('accepts every real topic and rejects an unrelated string', () => {
		const expr = generateWebhookTopics(document.webhookTopics, 'WEBHOOK_TOPICS', 'WebhookTopic');
		const { WebhookTopicSchema } = evaluate(expr);

		for (const topic of document.webhookTopics) {
			expect(WebhookTopicSchema.safeParse(topic).success).toBe(true);
		}
	});
});
