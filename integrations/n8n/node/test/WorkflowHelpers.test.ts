import type { IDataObject } from 'n8n-workflow';

jest.mock('../nodes/Featurebase/GenericFunctions', () => ({
	featurebaseApiRequest: jest.fn(),
	featurebaseApiRequestAllItems: jest.fn(),
}));

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../nodes/Featurebase/GenericFunctions';
import { executeWorkflowHelper } from '../nodes/Featurebase/descriptions/WorkflowHelpersDescription';

const mockedRequest = featurebaseApiRequest as jest.Mock;
const mockedRequestAllItems = featurebaseApiRequestAllItems as jest.Mock;

function createExecuteContext(params: IDataObject) {
	return {
		getNodeParameter: (name: string, _index: number, fallback?: unknown) => params[name] ?? fallback,
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

beforeEach(() => {
	mockedRequest.mockReset();
	mockedRequestAllItems.mockReset();
});

describe('upsertFeedback', () => {
	it('matches an existing similar post, upvotes it, and comments instead of creating a new one', async () => {
		mockedRequestAllItems.mockResolvedValueOnce([{ id: 'post-1', title: 'Add dark mode support' }]);
		mockedRequest.mockResolvedValueOnce({}); // add voter
		mockedRequest.mockResolvedValueOnce({}); // create comment
		mockedRequest.mockResolvedValueOnce({ id: 'post-1', title: 'Add dark mode support', content: '<p>hi</p>' }); // refetch

		const context = createExecuteContext({
			title: 'Add dark mode',
			content: 'please add it',
			boardId: { mode: 'id', value: 'board-1' },
			author: { email: 'user@example.com' },
			options: { threshold: 0.5 },
		});

		const result = (await executeWorkflowHelper.call(context as never, 0, 'upsertFeedback')) as IDataObject;

		expect(result.matched).toBe(true);
		expect(mockedRequest).toHaveBeenCalledWith('POST', '/v2/posts/post-1/voters', { email: 'user@example.com' });
		expect(mockedRequest).toHaveBeenCalledWith('POST', '/v2/comments', expect.objectContaining({ postId: 'post-1' }));
	});

	it('creates a new post when no existing post is similar enough', async () => {
		mockedRequestAllItems.mockResolvedValueOnce([{ id: 'post-2', title: 'Completely unrelated' }]);
		mockedRequest.mockResolvedValueOnce({ id: 'post-3', title: 'Export CSV', content: '<p>please add export</p>' });

		const context = createExecuteContext({
			title: 'Export CSV',
			content: 'please add export',
			boardId: { mode: 'id', value: 'board-1' },
			options: { threshold: 0.7 },
		});

		const result = (await executeWorkflowHelper.call(context as never, 0, 'upsertFeedback')) as IDataObject;

		expect(result.matched).toBe(false);
		expect(mockedRequest).toHaveBeenCalledWith('POST', '/v2/posts', expect.objectContaining({ title: 'Export CSV' }));
	});
});

describe('revenueWeightedScore', () => {
	it('sums open and closed hubspot deals for a single post', async () => {
		mockedRequest.mockResolvedValueOnce({
			id: 'post-1',
			upvotes: 10,
			integrations: {
				hubspot: [
					{ objectId: 1, type: 'DEAL', dealAmount: 5000, dealClosed: false },
					{ objectId: 2, type: 'DEAL', dealAmount: 2000, dealClosed: true },
				],
			},
		});

		const context = createExecuteContext({ source: 'single', postId: { mode: 'id', value: 'post-1' }, divisor: 1000 });
		const result = (await executeWorkflowHelper.call(context as never, 0, 'revenueWeightedScore')) as IDataObject;

		expect(result.openPipeline).toBe(5000);
		expect(result.closedRevenue).toBe(2000);
		expect(result.arrWeight).toBe(10 + 5000 / 1000);
	});

	it('sorts many posts by arrWeight descending', async () => {
		mockedRequestAllItems.mockResolvedValueOnce([
			{ id: 'a', upvotes: 5, integrations: { hubspot: [{ dealAmount: 1000, dealClosed: false }] } },
			{ id: 'b', upvotes: 5, integrations: { hubspot: [{ dealAmount: 50000, dealClosed: false }] } },
		]);

		const context = createExecuteContext({ source: 'query', divisor: 1000, queryOptions: {} });
		const result = (await executeWorkflowHelper.call(context as never, 0, 'revenueWeightedScore')) as IDataObject[];

		expect(result[0].id).toBe('b');
		expect(result[1].id).toBe('a');
	});

	it('treats a post with no hubspot deals as zero pipeline', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1', upvotes: 3 });

		const context = createExecuteContext({ source: 'single', postId: { mode: 'id', value: 'post-1' }, divisor: 1000 });
		const result = (await executeWorkflowHelper.call(context as never, 0, 'revenueWeightedScore')) as IDataObject;

		expect(result.openPipeline).toBe(0);
		expect(result.arrWeight).toBe(3);
	});
});

describe('bulkImport', () => {
	it('reports per-row success and failure without aborting the batch', async () => {
		mockedRequestAllItems
			.mockResolvedValueOnce([{ id: 'board-1', name: 'Feature Requests' }])
			.mockResolvedValueOnce([{ id: 'status-1', name: 'Under Review' }]);
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' }).mockRejectedValueOnce(new Error('title is required'));

		const context = createExecuteContext({
			items: JSON.stringify([
				{ title: 'Row one', content: 'a', board: 'Feature Requests', status: 'Under Review' },
				{ title: '', content: 'b', board: 'Feature Requests' },
			]),
		});

		const result = (await executeWorkflowHelper.call(context as never, 0, 'bulkImport')) as IDataObject[];

		expect(result).toHaveLength(2);
		expect(result[0].success).toBe(true);
		expect(result[1].success).toBe(false);
		expect(result[1].error).toBe('title is required');
	});

	it('resolves board and status names to ids', async () => {
		mockedRequestAllItems
			.mockResolvedValueOnce([{ id: 'board-1', name: 'Feature Requests' }])
			.mockResolvedValueOnce([{ id: 'status-1', name: 'Under Review' }]);
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			items: JSON.stringify([{ title: 'Row one', content: 'a', board: 'Feature Requests', status: 'Under Review' }]),
		});

		await executeWorkflowHelper.call(context as never, 0, 'bulkImport');

		expect(mockedRequest).toHaveBeenCalledWith('POST', '/v2/posts', expect.objectContaining({ boardId: 'board-1', statusId: 'status-1' }));
	});
});

describe('setStatusWithChangelogDraft', () => {
	it('updates the post status and creates a draft changelog from it', async () => {
		mockedRequest
			.mockResolvedValueOnce({ id: 'post-1', title: 'Add dark mode', content: '<p>done</p>' })
			.mockResolvedValueOnce({ id: 'changelog-1', title: 'Add dark mode', state: 'draft' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			statusId: { mode: 'id', value: 'status-completed' },
			changelogOptions: {},
		});

		const result = (await executeWorkflowHelper.call(context as never, 0, 'setStatusWithChangelogDraft')) as IDataObject;

		expect(mockedRequest).toHaveBeenNthCalledWith(1, 'PATCH', '/v2/posts/post-1', { statusId: 'status-completed' });
		expect(mockedRequest).toHaveBeenNthCalledWith(2, 'POST', '/v2/changelogs', expect.objectContaining({ title: 'Add dark mode', htmlContent: '<p>done</p>' }));
		expect((result.post as IDataObject).id).toBe('post-1');
		expect((result.changelog as IDataObject).id).toBe('changelog-1');
	});

	it('uses an explicit changelog title and content override when given', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1', title: 'Add dark mode', content: '<p>done</p>' }).mockResolvedValueOnce({ id: 'changelog-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			statusId: { mode: 'id', value: 'status-completed' },
			changelogOptions: { changelogTitle: 'Custom title', changelogContent: 'Custom **markdown**' },
		});

		await executeWorkflowHelper.call(context as never, 0, 'setStatusWithChangelogDraft');

		expect(mockedRequest).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/v2/changelogs',
			expect.objectContaining({ title: 'Custom title', markdownContent: 'Custom **markdown**' }),
		);
	});
});
