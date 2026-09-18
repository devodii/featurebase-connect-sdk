import type { IDataObject } from 'n8n-workflow';

jest.mock('../nodes/Featurebase/GenericFunctions', () => ({
	featurebaseApiRequest: jest.fn(),
	featurebaseApiRequestAllItems: jest.fn(),
}));

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../nodes/Featurebase/GenericFunctions';
import { executePost } from '../nodes/Featurebase/descriptions/PostDescription';

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

describe('post create', () => {
	it('does not send notifyAdmins on update (not a valid UpdatePostBody field)', async () => {
		// notifyAdmins has no UI field on update at all, so this documents the create-only contract via the body sent.
		mockedRequest.mockResolvedValueOnce({ id: 'post-1', content: '<p>hi</p>' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { inReview: true },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body).not.toHaveProperty('notifyAdmins');
	});

	it('sends notifyAdmins on create when set', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			title: 'Add dark mode',
			boardId: { mode: 'id', value: 'board-1' },
			content: '',
			additionalFields: { notifyAdmins: true },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'create');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.notifyAdmins).toBe(true);
	});
});

describe('post update', () => {
	it('sends boardId when moving a post to a different board', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { boardId: { mode: 'id', value: 'board-2' } },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.boardId).toBe('board-2');
	});

	it('sends eta: null to clear it when the field is present but empty', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { eta: '' },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.eta).toBeNull();
	});

	it('sends the real eta value when one is chosen', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { eta: '2026-03-01T00:00:00.000Z' },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.eta).toBe('2026-03-01T00:00:00.000Z');
	});

	it('sends assigneeId: null to unassign when the field is present but empty', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { assigneeId: { mode: 'list', value: '' } },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.assigneeId).toBeNull();
	});

	it('sends the real assigneeId when one is chosen', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { assigneeId: { mode: 'id', value: 'admin-1' } },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body.assigneeId).toBe('admin-1');
	});

	it('omits assigneeId entirely when the field was never added', async () => {
		mockedRequest.mockResolvedValueOnce({ id: 'post-1' });

		const context = createExecuteContext({
			postId: { mode: 'id', value: 'post-1' },
			content: '',
			updateFields: { inReview: true },
			markdown: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'update');

		const body = mockedRequest.mock.calls[0][2];
		expect(body).not.toHaveProperty('assigneeId');
	});
});

describe('post get many', () => {
	it('passes filters and sort options through as query params', async () => {
		mockedRequestAllItems.mockResolvedValueOnce([]);

		const context = createExecuteContext({
			filters: { boardId: ['board-1'] },
			sortBy: 'trending',
			sortOrder: 'desc',
			returnAll: true,
			simplify: false,
		});

		await executePost.call(context as never, 0, 'getMany');

		expect(mockedRequestAllItems).toHaveBeenCalledWith(
			'/v2/posts',
			expect.objectContaining({ sortBy: 'trending', sortOrder: 'desc', boardId: ['board-1'] }),
			true,
			undefined,
		);
	});
});
