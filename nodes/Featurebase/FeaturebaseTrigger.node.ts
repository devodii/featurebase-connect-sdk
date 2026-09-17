import type { IDataObject, IHookFunctions, IWebhookFunctions, IWebhookResponseData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { WEBHOOK_TOPICS } from './descriptions/webhookTopics';
import { featurebaseApiRequest, featurebaseApiRequestAllItems, getAdmins, getBoards, getPostStatuses, getPostTags } from './GenericFunctions';
import { htmlToText } from './utils/html';
import { verifyHmacSha256 } from './utils/hmac';

const MAX_SEEN_EVENT_IDS = 500;
const SIGNATURE_HEADER_CANDIDATES = ['featurebase-signature', 'x-featurebase-signature'];

const STATUS_TYPES = [
	{ name: 'Reviewing', value: 'reviewing' },
	{ name: 'Unstarted', value: 'unstarted' },
	{ name: 'Active', value: 'active' },
	{ name: 'Completed', value: 'completed' },
	{ name: 'Canceled', value: 'canceled' },
];

const AUTHOR_TYPES = [
	{ name: 'Admin', value: 'admin' },
	{ name: 'Customer', value: 'customer' },
	{ name: 'Guest', value: 'guest' },
	{ name: 'Integration', value: 'integration' },
	{ name: 'Bot', value: 'bot' },
	{ name: 'Lead', value: 'lead' },
];

const INTEGRATION_KEYS = ['linear', 'jira', 'clickup', 'github', 'devops', 'hubspot'];

interface FeaturebaseTriggerStaticData extends IDataObject {
	webhookId?: string;
	secret?: string;
	fallbackToken?: string;
	seenEventIds?: string[];
	upvoteThresholdFired?: string[];
}

function getStaticData(context: IHookFunctions | IWebhookFunctions): FeaturebaseTriggerStaticData {
	return context.getWorkflowStaticData('node') as FeaturebaseTriggerStaticData;
}

function extractChanges(body: IDataObject): IDataObject[] {
	const raw = (body.changes ?? (body.data as IDataObject)?.changes) as unknown;
	if (!Array.isArray(raw)) return [];
	return raw.filter((entry): entry is IDataObject => typeof entry === 'object' && entry !== null);
}

function findChange(changes: IDataObject[], fieldNames: string[]): IDataObject | undefined {
	return changes.find((change) => {
		const field = (change.field ?? change.key ?? change.path) as string | undefined;
		return field !== undefined && fieldNames.includes(field);
	});
}

function changeNewValue(change: IDataObject | undefined): unknown {
	if (!change) return undefined;
	return change.newValue ?? change.to ?? change.value;
}

export class FeaturebaseTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Featurebase Trigger',
		name: 'featurebaseTrigger',
		icon: { light: 'file:Featurebase.svg', dark: 'file:Featurebase.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["derivedEvent"] || ($parameter["topics"] || []).join(", ")}}',
		description: 'Starts a workflow when a Featurebase event occurs',
		defaults: { name: 'Featurebase Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'featurebaseApi', required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'Featurebase events to subscribe to. Ticket topics exist in the API but are out of scope for this package (see reference/FINDINGS.md).',
				options: WEBHOOK_TOPICS.map(({ name, value, group }) => ({ name: `${group}: ${name}`, value })),
			},
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				description: 'Evaluated after Featurebase has already delivered the event, so you do not need a separate IF node',
				options: [
					{
						displayName: 'Author Type',
						name: 'authorType',
						type: 'options',
						default: '',
						options: AUTHOR_TYPES,
					},
					{
						displayName: 'Board Name or ID',
						name: 'boardId',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getBoards' },
						default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Minimum Upvotes',
						name: 'minUpvotes',
						type: 'number',
						default: 0,
						typeOptions: { minValue: 0 },
					},
					{
						displayName: 'Status Name or ID',
						name: 'statusId',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getPostStatuses' },
						default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Status Type',
						name: 'statusType',
						type: 'options',
						default: '',
						options: STATUS_TYPES,
						description: 'Filter by the workflow stage a post status represents',
					},
					{
						displayName: 'Tag Name or ID',
						name: 'tag',
						type: 'options',
						typeOptions: { loadOptionsMethod: 'getPostTags' },
						default: '',
						description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
				],
			},
			{
				displayName: 'Derived Event',
				name: 'derivedEvent',
				type: 'options',
				default: '',
				description: "Optional higher-level event built on top of the raw topics using the payload's changes array",
				options: [
					{ name: '(None - Use Raw Topics Only)', value: '' },
					{ name: 'AI Handover Requested', value: 'aiHandoverRequested' },
					{ name: 'Assignee Changed', value: 'assigneeChanged' },
					{ name: 'Customer Commented on Assigned Post', value: 'customerCommentedOnAssignedPost' },
					{ name: 'ETA Set or Changed', value: 'etaChanged' },
					{ name: 'Post Linked to Integration', value: 'postLinkedToIntegration' },
					{ name: 'Status Changed to X', value: 'statusChangedTo' },
					{ name: 'Upvote Threshold Crossed', value: 'upvoteThresholdCrossed' },
				],
			},
			{
				displayName: 'Target Status Name or ID',
				name: 'targetStatusId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getPostStatuses' },
				default: '',
				required: true,
				displayOptions: { show: { derivedEvent: ['statusChangedTo'] } },
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Upvote Threshold',
				name: 'upvoteThreshold',
				type: 'number',
				default: 25,
				required: true,
				typeOptions: { minValue: 1 },
				displayOptions: { show: { derivedEvent: ['upvoteThresholdCrossed'] } },
				description: 'Fires once per post the first time its upvotes reach this number',
			},
			{
				displayName: 'Integration',
				name: 'integration',
				type: 'options',
				default: 'linear',
				required: true,
				displayOptions: { show: { derivedEvent: ['postLinkedToIntegration'] } },
				options: INTEGRATION_KEYS.map((key) => ({
					name:
						key === 'clickup'
							? 'ClickUp'
							: key === 'github'
								? 'GitHub'
								: key === 'devops'
									? 'Azure DevOps'
									: key === 'hubspot'
										? 'HubSpot'
										: key[0].toUpperCase() + key.slice(1),
					value: key,
				})),
			},
			{
				displayName: 'Assigned to Admin Name or ID',
				name: 'assignedToAdminId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getAdmins' },
				default: '',
				displayOptions: { show: { derivedEvent: ['assigneeChanged', 'customerCommentedOnAssignedPost'] } },
				description:
					'Optional: only fire when the post is assigned to this admin. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Output',
				name: 'output',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Flatten',
						name: 'flatten',
						type: 'boolean',
						default: true,
						description: "Whether to spread the event item's fields to the top level of the output",
					},
					{
						displayName: 'Include Raw Payload',
						name: 'includeRaw',
						type: 'boolean',
						default: false,
						description: 'Whether to include the raw, unprocessed webhook payload under a "raw" key',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			getBoards,
			getPostStatuses,
			getPostTags,
			getAdmins,
		},
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = getStaticData(this);
				if (!staticData.webhookId) return false;

				try {
					await featurebaseApiRequest.call(this, 'GET', `/v2/webhooks/${staticData.webhookId}`);
					return true;
				} catch {
					delete staticData.webhookId;
					delete staticData.secret;
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const topics = this.getNodeParameter('topics', []) as string[];
				const staticData = getStaticData(this);

				if (!topics.length) {
					throw new NodeOperationError(this.getNode(), 'Select at least one topic to subscribe to');
				}

				const existing = await featurebaseApiRequestAllItems.call(this, '/v2/webhooks');
				const alreadyRegistered = (existing as IDataObject[]).find((webhook) => webhook.url === webhookUrl);
				if (alreadyRegistered) {
					staticData.webhookId = alreadyRegistered.id as string;
					return true;
				}

				try {
					const webhook = (await featurebaseApiRequest.call(this, 'POST', '/v2/webhooks', {
						name: `n8n: ${this.getWorkflow().name ?? this.getNode().name}`,
						url: webhookUrl,
						topics,
					})) as IDataObject;

					staticData.webhookId = webhook.id as string;
					staticData.secret = webhook.secret as string | undefined;
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (message.toLowerCase().includes('limit') || message.toLowerCase().includes('maximum')) {
						throw new NodeOperationError(
							this.getNode(),
							"Featurebase allows a maximum of 10 webhooks per organization. Delete an old endpoint (Settings > Webhooks, or the Featurebase node's Webhook resource) before activating this trigger.",
						);
					}
					throw new NodeOperationError(this.getNode(), error as Error);
				}

				staticData.seenEventIds = [];
				staticData.upvoteThresholdFired = [];
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = getStaticData(this);
				if (!staticData.webhookId) return true;

				try {
					await featurebaseApiRequest.call(this, 'DELETE', `/v2/webhooks/${staticData.webhookId}`);
				} catch (error) {
					this.logger.warn(
						`Featurebase Trigger: failed to delete webhook ${staticData.webhookId} on deactivation, it may already be gone: ${
							error instanceof Error ? error.message : String(error)
						}`,
					);
				}

				delete staticData.webhookId;
				delete staticData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData();
		const headers = this.getHeaderData();
		const staticData = getStaticData(this);

		const topic = (body.topic ?? body.type ?? body.event) as string | undefined;
		const eventId = (body.id ?? body.eventId) as string | undefined;
		const item = ((body.data as IDataObject)?.item ?? (body.data as IDataObject)?.object ?? body.data ?? {}) as IDataObject;
		const changes = extractChanges(body);

		if (eventId) {
			const seen = staticData.seenEventIds ?? [];
			if (seen.includes(eventId)) {
				return { workflowData: [] };
			}
			staticData.seenEventIds = [...seen, eventId].slice(-MAX_SEEN_EVENT_IDS);
		}

		let signatureVerified = false;
		if (staticData.secret) {
			const signatureHeader = SIGNATURE_HEADER_CANDIDATES.map((name) => headers[name]).find((value) => typeof value === 'string') as string | undefined;
			if (signatureHeader) {
				try {
					signatureVerified = verifyHmacSha256(JSON.stringify(body), staticData.secret, signatureHeader);
				} catch {
					signatureVerified = false;
				}
			}
		}

		const filters = this.getNodeParameter('filters', {}) as IDataObject;
		if (filters.boardId && item.boardId !== filters.boardId) return { workflowData: [] };
		if (filters.statusId && (item.status as IDataObject)?.id !== filters.statusId) return { workflowData: [] };
		if (filters.statusType && (item.status as IDataObject)?.type !== filters.statusType) return { workflowData: [] };
		if (filters.tag) {
			const tagNames = ((item.tags as IDataObject[]) ?? []).map((tag) => tag.name);
			if (!tagNames.includes(filters.tag)) return { workflowData: [] };
		}
		if (filters.authorType && (item.author as IDataObject)?.type !== filters.authorType) return { workflowData: [] };
		if (typeof filters.minUpvotes === 'number' && filters.minUpvotes > 0) {
			if (typeof item.upvotes !== 'number' || item.upvotes < filters.minUpvotes) return { workflowData: [] };
		}

		const derivedEvent = this.getNodeParameter('derivedEvent', '') as string;
		if (derivedEvent) {
			const matched = await evaluateDerivedEvent(this, derivedEvent, topic, item, changes, staticData);
			if (!matched) return { workflowData: [] };
		}

		const output = this.getNodeParameter('output', {}) as IDataObject;
		const flatten = output.flatten !== false;
		const includeRaw = output.includeRaw === true;

		const contentField = typeof item.content === 'string' ? item.content : typeof item.body === 'string' ? item.body : undefined;

		const outputItem: IDataObject = {
			...(flatten ? item : { item }),
			topic,
			eventId,
			createdAt: body.createdAt ?? item.createdAt,
			organizationId: body.organizationId,
			webhookId: staticData.webhookId,
			changedFields: changes.map((change) => (change.field ?? change.key ?? change.path) as string).filter(Boolean),
			changes,
			signatureVerified,
		};

		if (contentField) outputItem.contentText = htmlToText(contentField);
		if (item.postUrl) outputItem.postUrl = item.postUrl;
		if (includeRaw) outputItem.raw = body;

		return {
			workflowData: [[{ json: outputItem }]],
		};
	}
}

async function evaluateDerivedEvent(
	context: IWebhookFunctions,
	derivedEvent: string,
	topic: string | undefined,
	item: IDataObject,
	changes: IDataObject[],
	staticData: FeaturebaseTriggerStaticData,
): Promise<boolean> {
	switch (derivedEvent) {
		case 'statusChangedTo': {
			if (topic !== 'post.updated') return false;
			const targetStatusId = context.getNodeParameter('targetStatusId', '') as string;
			const statusChange = findChange(changes, ['status', 'statusId']);
			if (statusChange) {
				const newValue = changeNewValue(statusChange);
				const newStatusId = typeof newValue === 'object' && newValue ? (newValue as IDataObject).id : newValue;
				return newStatusId === targetStatusId;
			}
			return (item.status as IDataObject)?.id === targetStatusId;
		}

		case 'upvoteThresholdCrossed': {
			if (topic !== 'post.voted') return false;
			const threshold = context.getNodeParameter('upvoteThreshold', 25) as number;
			const upvotes = typeof item.upvotes === 'number' ? item.upvotes : 0;
			if (upvotes < threshold) return false;

			const fired = staticData.upvoteThresholdFired ?? [];
			const postId = item.id as string | undefined;
			if (!postId) return true;
			if (fired.includes(postId)) return false;

			staticData.upvoteThresholdFired = [...fired, postId].slice(-MAX_SEEN_EVENT_IDS);
			return true;
		}

		case 'postLinkedToIntegration': {
			if (topic !== 'post.updated') return false;
			const integration = context.getNodeParameter('integration', 'linear') as string;
			const integrationsChange = findChange(changes, ['integrations']);
			if (integrationsChange) return true;
			const linked = ((item.integrations as IDataObject)?.[integration] as unknown[]) ?? [];
			return linked.length > 0;
		}

		case 'etaChanged': {
			if (topic !== 'post.updated') return false;
			const etaChange = findChange(changes, ['eta']);
			if (etaChange) return true;
			return Boolean(item.eta);
		}

		case 'assigneeChanged': {
			if (topic !== 'post.updated') return false;
			const assigneeChange = findChange(changes, ['assigneeId', 'assignee']);
			if (!assigneeChange) return false;

			const filterAdminId = context.getNodeParameter('assignedToAdminId', '') as string;
			if (filterAdminId && item.assigneeId !== filterAdminId) return false;
			return true;
		}

		case 'customerCommentedOnAssignedPost': {
			if (topic !== 'comment.created') return false;
			const authorType = (item.author as IDataObject)?.type as string | undefined;
			if (!authorType || !['customer', 'lead'].includes(authorType)) return false;

			const postId = item.postId as string | undefined;
			if (!postId) return false;

			const post = (await featurebaseApiRequest.call(context, 'GET', `/v2/posts/${postId}`)) as IDataObject;
			const filterAdminId = context.getNodeParameter('assignedToAdminId', '') as string;
			if (!post.assigneeId) return false;
			if (filterAdminId) return post.assigneeId === filterAdminId;
			return true;
		}

		case 'aiHandoverRequested':
			return topic === 'conversation.handover_requested';

		default:
			return true;
	}
}
