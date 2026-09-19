import type { IDataObject } from 'n8n-workflow';

import { FeaturebaseTrigger } from '../nodes/Featurebase/FeaturebaseTrigger.node';
import { hmacSha256Hex } from '../nodes/Featurebase/utils/hmac';
import postCreated from './fixtures/post.created.json';
import postUpdatedAssigneeChanged from './fixtures/post.updated.assignee-changed.json';
import postUpdatedEtaSet from './fixtures/post.updated.eta-set.json';
import postUpdatedIntegrationLinked from './fixtures/post.updated.integration-linked.json';
import postUpdatedStatusChanged from './fixtures/post.updated.status-changed.json';
import postVoted from './fixtures/post.voted.json';

interface MockOptions {
	body: IDataObject;
	headers?: Record<string, string>;
	params?: IDataObject;
	staticData?: IDataObject;
	httpRequestWithAuthentication?: jest.Mock;
}

function createWebhookContext(options: MockOptions) {
	const staticData = options.staticData ?? {};
	const params = options.params ?? {};
	const jsonMock = jest.fn();
	const statusMock = jest.fn(() => ({ json: jsonMock }));

	return {
		getBodyData: () => options.body,
		getHeaderData: () => options.headers ?? {},
		getWorkflowStaticData: () => staticData,
		getNodeParameter: (name: string, fallback?: unknown) => params[name] ?? fallback,
		getNode: () => ({
			id: '1',
			name: 'Featurebase Trigger',
			type: 'n8n-nodes-featurebase.featurebaseTrigger',
			typeVersion: 1,
			position: [0, 0] as [number, number],
			parameters: {},
		}),
		getCredentials: jest.fn().mockResolvedValue({ baseUrl: 'https://do.featurebase.app', apiKey: 'sk_test', apiVersion: '2026-01-01.nova' }),
		getResponseObject: () => ({ status: statusMock }),
		helpers: { httpRequestWithAuthentication: options.httpRequestWithAuthentication ?? jest.fn() },
		__statusMock: statusMock,
		__jsonMock: jsonMock,
	};
}

describe('FeaturebaseTrigger webhook()', () => {
	const trigger = new FeaturebaseTrigger();

	it('emits the item fields flattened by default, plus envelope metadata', async () => {
		const context = createWebhookContext({ body: postCreated as IDataObject });

		const result = await trigger.webhook.call(context as never);

		expect(result.workflowData).toHaveLength(1);
		const json = result.workflowData![0][0].json;
		expect(json.title).toBe('Add dark mode support');
		expect(json.topic).toBe('post.created');
		expect(json.eventId).toBe('evt_post_created_1');
		expect(json.organizationId).toBe('507f1f77bcf86cd799439099');
		expect(json.contentText).toBe('It would be great to have a dark mode option.');
		expect(json.postUrl).toBe('https://feedback.example.com/p/add-dark-mode-support');
	});

	it('nests the item under "item" when flatten is disabled', async () => {
		const context = createWebhookContext({ body: postCreated as IDataObject, params: { output: { flatten: false } } });

		const result = await trigger.webhook.call(context as never);
		const json = result.workflowData![0][0].json as IDataObject;

		expect(json.item).toBeDefined();
		expect((json.item as IDataObject).title).toBe('Add dark mode support');
		expect(json.title).toBeUndefined();
	});

	it('includes the raw payload when includeRaw is enabled', async () => {
		const context = createWebhookContext({ body: postCreated as IDataObject, params: { output: { includeRaw: true } } });

		const result = await trigger.webhook.call(context as never);
		const json = result.workflowData![0][0].json as IDataObject;

		expect(json.raw).toEqual(postCreated);
	});

	it('extracts changedFields from the changes array', async () => {
		const context = createWebhookContext({ body: postUpdatedStatusChanged as IDataObject });

		const result = await trigger.webhook.call(context as never);
		const json = result.workflowData![0][0].json as IDataObject;

		expect(json.changedFields).toEqual(['status']);
		expect(json.changes).toHaveLength(1);
	});

	it('dedupes repeated deliveries of the same event id', async () => {
		const staticData: IDataObject = {};
		const context1 = createWebhookContext({ body: postCreated as IDataObject, staticData });
		const first = await trigger.webhook.call(context1 as never);
		expect(first.workflowData).toHaveLength(1);

		const context2 = createWebhookContext({ body: postCreated as IDataObject, staticData });
		const second = await trigger.webhook.call(context2 as never);
		expect(second.workflowData).toEqual([]);
	});

	describe('signature verification', () => {
		it('accepts the request and flags signatureVerified when the header matches', async () => {
			const secret = 'whsec_testsecret';
			const signature = hmacSha256Hex(JSON.stringify(postCreated), secret);
			const context = createWebhookContext({
				body: postCreated as IDataObject,
				headers: { 'featurebase-signature': signature },
				staticData: { secret },
			});

			const result = await trigger.webhook.call(context as never);

			expect(result.workflowData).toHaveLength(1);
			expect((result.workflowData![0][0].json as IDataObject).signatureVerified).toBe(true);
		});

		it('rejects with 401 when a signature header is present but does not match', async () => {
			const context = createWebhookContext({
				body: postCreated as IDataObject,
				headers: { 'featurebase-signature': 'not-the-right-signature' },
				staticData: { secret: 'whsec_testsecret' },
			});

			const result = await trigger.webhook.call(context as never);

			expect(context.__statusMock).toHaveBeenCalledWith(401);
			expect(context.__jsonMock).toHaveBeenCalledWith({ error: 'invalid_signature' });
			expect(result).toEqual({ noWebhookResponse: true });
		});

		it('does not reject when no signature header is present, but flags signatureVerified false', async () => {
			const context = createWebhookContext({
				body: postCreated as IDataObject,
				staticData: { secret: 'whsec_testsecret' },
			});

			const result = await trigger.webhook.call(context as never);

			expect(context.__statusMock).not.toHaveBeenCalled();
			expect(result.workflowData).toHaveLength(1);
			expect((result.workflowData![0][0].json as IDataObject).signatureVerified).toBe(false);
		});

		it('does not attempt verification when no secret is stored', async () => {
			const context = createWebhookContext({ body: postCreated as IDataObject, staticData: {} });

			const result = await trigger.webhook.call(context as never);

			expect(result.workflowData).toHaveLength(1);
			expect((result.workflowData![0][0].json as IDataObject).signatureVerified).toBe(false);
		});
	});

	describe('filters', () => {
		it('drops items that do not match the board filter', async () => {
			const context = createWebhookContext({
				body: postCreated as IDataObject,
				params: { filters: { boardId: 'some-other-board' } },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});

		it('passes items that match the board filter', async () => {
			const context = createWebhookContext({
				body: postCreated as IDataObject,
				params: { filters: { boardId: '507f1f77bcf86cd799439001' } },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toHaveLength(1);
		});

		it('drops items below the minimum upvotes filter', async () => {
			const context = createWebhookContext({
				body: postVoted as IDataObject,
				params: { filters: { minUpvotes: 100 } },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});
	});

	describe('derived events', () => {
		it('statusChangedTo matches when the new status equals the target', async () => {
			const context = createWebhookContext({
				body: postUpdatedStatusChanged as IDataObject,
				params: { derivedEvent: 'statusChangedTo', targetStatusId: '507f1f77bcf86cd799439032' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toHaveLength(1);
		});

		it('statusChangedTo does not match a different target status', async () => {
			const context = createWebhookContext({
				body: postUpdatedStatusChanged as IDataObject,
				params: { derivedEvent: 'statusChangedTo', targetStatusId: 'some-other-status' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});

		it('upvoteThresholdCrossed fires once per post at the threshold', async () => {
			const staticData: IDataObject = {};
			const params = { derivedEvent: 'upvoteThresholdCrossed', upvoteThreshold: 25 };

			const first = await trigger.webhook.call(createWebhookContext({ body: postVoted as IDataObject, params, staticData }) as never);
			expect(first.workflowData).toHaveLength(1);

			const secondPayload = { ...(postVoted as IDataObject), id: 'evt_post_voted_2' };
			const second = await trigger.webhook.call(createWebhookContext({ body: secondPayload, params, staticData }) as never);
			expect(second.workflowData).toEqual([]);
		});

		it('upvoteThresholdCrossed does not fire below the threshold', async () => {
			const context = createWebhookContext({
				body: postVoted as IDataObject,
				params: { derivedEvent: 'upvoteThresholdCrossed', upvoteThreshold: 1000 },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});

		it('etaChanged matches when the changes array touches eta', async () => {
			const context = createWebhookContext({
				body: postUpdatedEtaSet as IDataObject,
				params: { derivedEvent: 'etaChanged' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toHaveLength(1);
		});

		it('etaChanged does not match an unrelated update', async () => {
			const context = createWebhookContext({
				body: postUpdatedAssigneeChanged as IDataObject,
				params: { derivedEvent: 'etaChanged' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});

		it('assigneeChanged matches on any assignee change with no filter set', async () => {
			const context = createWebhookContext({
				body: postUpdatedAssigneeChanged as IDataObject,
				params: { derivedEvent: 'assigneeChanged' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toHaveLength(1);
		});

		it('assigneeChanged respects the assigned-to-admin filter', async () => {
			const context = createWebhookContext({
				body: postUpdatedAssigneeChanged as IDataObject,
				params: { derivedEvent: 'assigneeChanged', assignedToAdminId: 'someone-else' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});

		it('postLinkedToIntegration matches when the changes array touches integrations', async () => {
			const context = createWebhookContext({
				body: postUpdatedIntegrationLinked as IDataObject,
				params: { derivedEvent: 'postLinkedToIntegration', integration: 'linear' },
			});
			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toHaveLength(1);
		});

		it('aiHandoverRequested matches only its exact topic', async () => {
			const matching = createWebhookContext({
				body: { topic: 'conversation.handover_requested', id: 'evt_1', data: { item: {} } },
				params: { derivedEvent: 'aiHandoverRequested' },
			});
			expect((await trigger.webhook.call(matching as never)).workflowData).toHaveLength(1);

			const nonMatching = createWebhookContext({
				body: postCreated as IDataObject,
				params: { derivedEvent: 'aiHandoverRequested' },
			});
			expect((await trigger.webhook.call(nonMatching as never)).workflowData).toEqual([]);
		});

		it('customerCommentedOnAssignedPost fetches the post and checks its assignee', async () => {
			const httpRequestWithAuthentication = jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439011', assigneeId: 'admin-1' });
			const context = createWebhookContext({
				body: {
					topic: 'comment.created',
					id: 'evt_1',
					data: { item: { postId: '507f1f77bcf86cd799439011', author: { type: 'customer' } } },
				},
				params: { derivedEvent: 'customerCommentedOnAssignedPost', assignedToAdminId: 'admin-1' },
				httpRequestWithAuthentication,
			});

			const result = await trigger.webhook.call(context as never);

			expect(httpRequestWithAuthentication).toHaveBeenCalled();
			expect(result.workflowData).toHaveLength(1);
		});

		it('customerCommentedOnAssignedPost ignores comments from admins', async () => {
			const context = createWebhookContext({
				body: {
					topic: 'comment.created',
					id: 'evt_1',
					data: { item: { postId: '507f1f77bcf86cd799439011', author: { type: 'admin' } } },
				},
				params: { derivedEvent: 'customerCommentedOnAssignedPost' },
			});

			const result = await trigger.webhook.call(context as never);
			expect(result.workflowData).toEqual([]);
		});
	});
});
