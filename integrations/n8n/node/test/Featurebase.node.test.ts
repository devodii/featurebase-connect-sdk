import type { IDataObject } from 'n8n-workflow';

jest.mock('../nodes/Featurebase/descriptions/PostDescription', () => ({
	postOperations: { name: 'operation' },
	postFields: [],
	executePost: jest.fn(),
}));

import { executePost } from '../nodes/Featurebase/descriptions/PostDescription';
import { Featurebase } from '../nodes/Featurebase/Featurebase.node';

const mockedExecutePost = executePost as jest.Mock;

function createExecuteContext(resource: string, operation: string, itemCount: number) {
	return {
		getInputData: () => Array.from({ length: itemCount }, () => ({ json: {} })),
		getNodeParameter: (name: string) => (name === 'resource' ? resource : operation),
		continueOnFail: () => false,
		getNode: () => ({
			id: '1',
			name: 'Featurebase',
			type: 'n8n-nodes-featurebase.featurebase',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		}),
	};
}

describe('Featurebase.execute', () => {
	beforeEach(() => {
		mockedExecutePost.mockReset();
	});

	it('routes to the executor for the selected resource', async () => {
		mockedExecutePost.mockResolvedValue({ id: 'post-1' });
		const node = new Featurebase();
		const context = createExecuteContext('post', 'get', 1);

		const result = await node.execute.call(context as never);

		expect(mockedExecutePost).toHaveBeenCalledWith(0, 'get');
		expect(result[0][0].json).toEqual({ id: 'post-1' });
	});

	it('flattens an array result into multiple output items', async () => {
		mockedExecutePost.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
		const node = new Featurebase();
		const context = createExecuteContext('post', 'getMany', 1);

		const result = await node.execute.call(context as never);

		expect(result[0]).toHaveLength(2);
		expect(result[0].map((item) => item.json)).toEqual([{ id: 'a' }, { id: 'b' }]);
	});

	it('processes every input item', async () => {
		mockedExecutePost.mockResolvedValue({ id: 'post-1' });
		const node = new Featurebase();
		const context = createExecuteContext('post', 'get', 3);

		await node.execute.call(context as never);

		expect(mockedExecutePost).toHaveBeenCalledTimes(3);
	});

	it('rejects an unknown resource', async () => {
		const node = new Featurebase();
		const context = createExecuteContext('nonexistent', 'get', 1);

		await expect(node.execute.call(context as never)).rejects.toThrow('Unknown resource');
	});

	it('collects per-item errors as output when continueOnFail is enabled', async () => {
		mockedExecutePost.mockRejectedValue(new Error('boom'));
		const node = new Featurebase();
		const context = {
			...createExecuteContext('post', 'get', 1),
			continueOnFail: () => true,
		};

		const result = await node.execute.call(context as never);

		expect((result[0][0].json as IDataObject).error).toBe('boom');
	});

	it('throws when continueOnFail is disabled', async () => {
		mockedExecutePost.mockRejectedValue(new Error('boom'));
		const node = new Featurebase();
		const context = createExecuteContext('post', 'get', 1);

		await expect(node.execute.call(context as never)).rejects.toThrow();
	});
});
