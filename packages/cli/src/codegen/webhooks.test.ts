import { z } from 'zod';
import { loadOpenApi } from '../openapi/loader';
import { evalModule, SPEC_PATH } from '../test-support';
import { generateWebhookTopics } from './webhooks';

function evaluate(expr: string): { WEBHOOK_TOPICS: readonly string[]; WebhookTopicSchema: z.ZodTypeAny } {
	// The real generated file is TypeScript (export statements, a `type` alias), but
	// evalModule only runs plain JS, so strip everything that isn't runtime code.
	const script = expr
		.split('\n')
		.filter((line) => !line.startsWith('export type'))
		.map((line) => line.replace(/^export /, '').replace(/ as const;$/, ';'))
		.join('\n');
	return evalModule(`${script}\nreturn { WEBHOOK_TOPICS, WebhookTopicSchema };`, { z });
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
