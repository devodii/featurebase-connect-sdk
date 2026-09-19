import type { Equal, Expect, ExtractBody } from '@featurebase-connect-sdk/types';
import { defineHooks, runBeforeRequestHooks, type HookContext } from './hooks';

describe('runBeforeRequestHooks', () => {
	it('returns the payload unchanged when there are no hooks', async () => {
		const payload = { title: 't', boardId: 'b1' };
		await expect(runBeforeRequestHooks('createPost', payload, undefined)).resolves.toBe(payload);
	});

	it('threads the payload through every hook in order', async () => {
		const seen: string[] = [];
		const hooks = [
			(ctx: HookContext<'createPost'>) => {
				seen.push('first');
				return { ...ctx.payload, title: `${ctx.payload.title}-a` };
			},
			(ctx: HookContext<'createPost'>) => {
				seen.push('second');
				return { ...ctx.payload, title: `${ctx.payload.title}-b` };
			},
		];

		const result = await runBeforeRequestHooks('createPost', { title: 'start', boardId: 'b1' }, hooks);

		expect(seen).toEqual(['first', 'second']);
		expect(result.title).toBe('start-a-b');
	});

	it('supports an async hook', async () => {
		const hooks = [async (ctx: HookContext<'createPost'>) => ({ ...ctx.payload, title: ctx.payload.title.toUpperCase() })];
		const result = await runBeforeRequestHooks('createPost', { title: 'shout', boardId: 'b1' }, hooks);
		expect(result.title).toBe('SHOUT');
	});
});

describe('defineHooks', () => {
	it('infers a fully typed payload for each operation key with no manual generics', () => {
		const registry = defineHooks({
			createPost: [
				(ctx) => {
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					type _PayloadIsCreatePostBody = Expect<Equal<typeof ctx.payload, ExtractBody<'createPost'>>>;
					return { ...ctx.payload, title: ctx.payload.title.trim() };
				},
			],
		});

		expect(registry.createPost).toHaveLength(1);
	});
});
