import { z } from 'zod';
import { defineSchemas } from './registry';

describe('defineSchemas', () => {
	it('returns exactly what it was given', () => {
		const bodySchema = z.object({ title: z.string(), boardId: z.string() });
		const registry = defineSchemas({ createPost: { body: bodySchema } });

		expect(registry).toEqual({ createPost: { body: bodySchema } });
		expect(registry.createPost?.body).toBe(bodySchema);
	});
});
