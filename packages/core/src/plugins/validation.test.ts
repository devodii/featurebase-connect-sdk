import { z } from 'zod';
import { FeaturebaseValidationError } from '../client';
import type { SchemaRegistry } from '../registry';
import { createValidationPlugin } from './validation';

const registry = {
	createPost: {
		body: z.object({ title: z.string().min(2), boardId: z.string() }),
	},
	listPosts: {
		query: z.object({ boardId: z.string() }),
	},
	getPost: {
		params: z.object({ id: z.string().uuid() }),
	},
} as unknown as SchemaRegistry;

describe('createValidationPlugin', () => {
	it('passes a valid body through untouched and returns zod-parsed data', async () => {
		const plugin = createValidationPlugin(registry);
		const [result] = await plugin.hooks!.beforeExecute!('createPost' as never, [{ body: { title: 'Add dark mode', boardId: 'b1' } }]);

		expect(result).toEqual({ body: { title: 'Add dark mode', boardId: 'b1' } });
	});

	it('applies zod transforms, like defaults, to the parsed data', async () => {
		const schemaWithDefault = {
			createPost: { body: z.object({ title: z.string(), notifyAdmins: z.boolean().default(false) }) },
		} as unknown as SchemaRegistry;
		const plugin = createValidationPlugin(schemaWithDefault);

		const [result] = (await plugin.hooks!.beforeExecute!('createPost' as never, [{ body: { title: 'hi' } }])) as [{ body: { notifyAdmins: boolean } }];

		expect(result.body.notifyAdmins).toBe(false);
	});

	it('throws FeaturebaseValidationError with useful issues for an invalid body', () => {
		const plugin = createValidationPlugin(registry);

		try {
			plugin.hooks!.beforeExecute!('createPost' as never, [{ body: { title: 'x', boardId: 'b1' } }]);
			throw new Error('expected beforeExecute to throw');
		} catch (error) {
			expect(error).toMatchObject({
				name: 'FeaturebaseValidationError',
				operation: 'createPost',
				issues: [{ path: ['body', 'title'], message: expect.any(String) }],
			});
		}
	});

	it('throws FeaturebaseValidationError for an invalid query', () => {
		const plugin = createValidationPlugin(registry);

		expect(() => plugin.hooks!.beforeExecute!('listPosts' as never, [{ query: { boardId: 42 } }])).toThrow(FeaturebaseValidationError);
	});

	it('throws FeaturebaseValidationError for invalid path params', () => {
		const plugin = createValidationPlugin(registry);

		expect(() => plugin.hooks!.beforeExecute!('getPost' as never, [{ params: { id: 'not-a-uuid' } }])).toThrow(FeaturebaseValidationError);
	});

	it('passes operations with no registered schema through untouched', async () => {
		const plugin = createValidationPlugin(registry);
		const args = [{ body: { anything: 'goes' } }];

		const result = await plugin.hooks!.beforeExecute!('deletePost' as never, args);

		expect(result).toBe(args);
	});

	it('defaults to an empty options object when no schema requires validation and no args are given', async () => {
		const plugin = createValidationPlugin(registry);

		const result = await plugin.hooks!.beforeExecute!('deletePost' as never, []);

		expect(result).toEqual([]);
	});
});
