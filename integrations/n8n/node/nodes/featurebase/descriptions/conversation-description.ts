import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getFeaturebaseClient } from '../featurebase-client';
import { extractItems, limitField, pick, resourceLocatorField, returnAllField, simplifyField } from './shared';

const CONVERSATION_SIMPLIFY_FIELDS = [
	'id',
	'title',
	'state',
	'priority',
	'adminAssigneeId',
	'teamAssigneeId',
	'tags',
	'snoozedUntil',
	'createdAt',
	'updatedAt',
];

export const conversationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['conversation'] } },
	default: 'getMany',
	options: [
		{ name: 'Add Note', value: 'note', description: 'Add an internal note visible only to admins', action: 'Add a note to a conversation' },
		{ name: 'Add Participant', value: 'addParticipant', description: 'Add a contact to the conversation', action: 'Add a participant to a conversation' },
		{ name: 'Attach Tag', value: 'attachTag', description: 'Attach a tag to the conversation', action: 'Attach a tag to a conversation' },
		{ name: 'Create', value: 'create', description: 'Start a new conversation', action: 'Create a conversation' },
		{ name: 'Delete', value: 'delete', description: 'Delete a conversation', action: 'Delete a conversation' },
		{ name: 'Detach Tag', value: 'detachTag', description: 'Remove a tag from the conversation', action: 'Detach a tag from a conversation' },
		{ name: 'Get', value: 'get', description: 'Get a conversation by ID', action: 'Get a conversation' },
		{ name: 'Get Many', value: 'getMany', description: 'List conversations', action: 'Get many conversations' },
		{
			name: 'Remove Participant',
			value: 'removeParticipant',
			description: 'Remove a contact from the conversation',
			action: 'Remove a participant from a conversation',
		},
		{ name: 'Reply', value: 'reply', description: 'Reply to a conversation as an admin', action: 'Reply to a conversation' },
		{
			name: 'Update',
			value: 'update',
			description: 'Update state (open/close/snooze), assignee, title, or attributes',
			action: 'Update a conversation',
		},
	],
};

const conversationIdField: INodeProperties = {
	displayName: 'Conversation ID',
	name: 'conversationId',
	type: 'string',
	default: '',
	required: true,
};

export const conversationFields: INodeProperties[] = [
	{
		...conversationIdField,
		displayOptions: {
			show: {
				resource: ['conversation'],
				operation: ['get', 'update', 'delete', 'reply', 'note', 'addParticipant', 'removeParticipant', 'attachTag', 'detachTag'],
			},
		},
	},
	{
		displayName: 'From Type',
		name: 'fromType',
		type: 'options',
		default: 'contact',
		options: [
			{ name: 'Contact', value: 'contact', description: 'Conversation initiated by a customer or lead' },
			{ name: 'Admin', value: 'admin', description: 'Outreach conversation initiated by an admin' },
		],
		displayOptions: { show: { resource: ['conversation'], operation: ['create'] } },
	},
	{
		displayName: 'From ID',
		name: 'fromId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['conversation'], operation: ['create'] } },
		description: 'The Featurebase contact ID or admin ID, matching From Type',
	},
	{
		displayName: 'Message (Markdown)',
		name: 'bodyMarkdown',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['conversation'], operation: ['create', 'reply', 'note'] } },
		description: 'Featurebase renders this from markdown server-side, so no client-side conversion is applied',
	},
	{
		...resourceLocatorField('actingAdminId', 'Acting Admin', 'searchAdmins', {
			description: 'The admin performing this reply/note',
		}),
		displayOptions: { show: { resource: ['conversation'], operation: ['reply', 'note'] } },
	},
	{
		displayName: 'Skip Notifications',
		name: 'skipNotifications',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['conversation'], operation: ['reply', 'note'] } },
		description: 'Whether to skip sending notifications, useful for bulk imports',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['conversation'], operation: ['create'] } },
		options: [
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				default: 'desktop',
				options: [
					{ name: 'Desktop', value: 'desktop' },
					{ name: 'Email', value: 'email' },
				],
			},
			{ displayName: 'Subject', name: 'subject', type: 'string', default: '', description: 'Required for email channel with an admin sender' },
			{ displayName: 'Created At', name: 'createdAt', type: 'dateTime', default: '' },
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['conversation'], operation: ['update'] } },
		options: [
			{
				...resourceLocatorField('actingAdminId', 'Acting Admin', 'searchAdmins', { required: false }),
				description: 'The admin this change is attributed to',
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'open',
				options: [
					{ name: 'Open', value: 'open' },
					{ name: 'Closed', value: 'closed' },
					{ name: 'Snoozed', value: 'snoozed' },
				],
			},
			{
				displayName: 'Snoozed Until',
				name: 'snoozedUntil',
				type: 'dateTime',
				default: '',
				description: 'Required when State is Snoozed',
			},
			{
				...resourceLocatorField('adminAssigneeId', 'Assign to Admin', 'searchAdmins', { required: false }),
				description: 'Leave the By ID field empty to unassign',
			},
			{
				...resourceLocatorField('teamAssigneeId', 'Assign to Team', 'searchTeams', { required: false }),
				description: 'Leave the By ID field empty to unassign',
			},
			{ displayName: 'Title', name: 'title', type: 'string', default: '' },
			{ displayName: 'Custom Attributes (JSON)', name: 'customAttributes', type: 'json', default: '{}' },
		],
	},
	{
		displayName: 'Participant',
		name: 'participant',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['conversation'], operation: ['addParticipant'] } },
		options: [
			{ displayName: 'Featurebase Contact ID', name: 'id', type: 'string', default: '' },
			{ displayName: 'External User ID', name: 'userId', type: 'string', default: '' },
			{ displayName: 'Email', name: 'email', type: 'string', placeholder: 'name@email.com', default: '' },
		],
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['conversation'], operation: ['removeParticipant'] } },
		description: 'The Featurebase contact ID to remove',
	},
	{
		displayName: 'Tag ID',
		name: 'tagId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['conversation'], operation: ['attachTag', 'detachTag'] } },
	},
	{
		...resourceLocatorField('actingAdminId', 'Acting Admin', 'searchAdmins', {
			required: false,
			description: 'Required for Attach Tag and Detach Tag. Optional for participant changes (defaults to the system bot user).',
		}),
		displayOptions: { show: { resource: ['conversation'], operation: ['attachTag', 'detachTag', 'removeParticipant', 'addParticipant'] } },
	},
	{
		displayName: 'Tag IDs',
		name: 'tagIds',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['conversation'], operation: ['getMany'] } },
		description: 'Comma-separated tag IDs. Conversations must contain all provided tags.',
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['conversation'], operation: ['getMany'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['conversation'], operation: ['getMany'], returnAll: [false] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['conversation'], operation: ['get', 'getMany', 'create', 'update'] } },
	},
];

function extractId(value: unknown): string | undefined {
	if (value === undefined || value === '' || value === null) return undefined;
	if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
		const inner = (value as { value: unknown }).value;
		return inner ? String(inner) : undefined;
	}
	return String(value);
}

export async function executeConversation(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const client = await getFeaturebaseClient(this);
	const simplify = ['get', 'getMany', 'create', 'update'].includes(operation) ? (this.getNodeParameter('simplify', index, true) as boolean) : false;
	const finalize = (conversation: IDataObject): IDataObject => (simplify ? pick(conversation, CONVERSATION_SIMPLIFY_FIELDS) : conversation);

	switch (operation) {
		case 'getMany': {
			const tagIds = this.getNodeParameter('tagIds', index, '') as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? 100 : (this.getNodeParameter('limit', index) as number);
			const qs: IDataObject = { limit };
			if (tagIds) qs.tagIds = tagIds;
			const conversations = extractItems(await client.execute('listConversations', { query: qs as never }));
			return conversations.map(finalize);
		}

		case 'get': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const conversation = (await client.execute('getConversationById', { params: { id: conversationId } })) as IDataObject;
			return finalize(conversation);
		}

		case 'create': {
			const fromType = this.getNodeParameter('fromType', index) as string;
			const fromId = this.getNodeParameter('fromId', index) as string;
			const bodyMarkdown = this.getNodeParameter('bodyMarkdown', index) as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = { from: { type: fromType, id: fromId }, bodyMarkdown, ...additionalFields };
			const conversation = (await client.execute('createConversation', { body: body as never })) as IDataObject;
			return finalize(conversation);
		}

		case 'update': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const fields = this.getNodeParameter('updateFields', index, {}) as IDataObject;

			const body: IDataObject = {};
			if (fields.actingAdminId) body.actingAdminId = extractId(fields.actingAdminId);
			if (fields.state) body.state = fields.state;
			if (fields.snoozedUntil) body.snoozedUntil = fields.snoozedUntil;
			if (fields.adminAssigneeId !== undefined) body.adminAssigneeId = extractId(fields.adminAssigneeId) ?? null;
			if (fields.teamAssigneeId !== undefined) body.teamAssigneeId = extractId(fields.teamAssigneeId) ?? null;
			if (fields.title) body.title = fields.title;
			if (fields.customAttributes && fields.customAttributes !== '{}') {
				body.customAttributes = typeof fields.customAttributes === 'string' ? JSON.parse(fields.customAttributes) : fields.customAttributes;
			}

			const conversation = (await client.execute('updateConversation', { params: { id: conversationId }, body: body as never })) as IDataObject;
			return finalize(conversation);
		}

		case 'delete': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			return (await client.execute('deleteConversation', { params: { id: conversationId } })) as IDataObject;
		}

		case 'reply':
		case 'note': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const bodyMarkdown = this.getNodeParameter('bodyMarkdown', index) as string;
			const actingAdminId = extractId(this.getNodeParameter('actingAdminId', index));
			const skipNotifications = this.getNodeParameter('skipNotifications', index, false) as boolean;

			const body: IDataObject = {
				type: 'admin',
				id: actingAdminId,
				bodyMarkdown,
				messageType: operation === 'reply' ? 'reply' : 'note',
				skipNotifications,
			};

			return (await client.execute('replyToConversation', { params: { id: conversationId }, body: body as never })) as IDataObject;
		}

		case 'addParticipant': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const participant = this.getNodeParameter('participant', index, {}) as IDataObject;
			const actingAdminId = extractId(this.getNodeParameter('actingAdminId', index, ''));

			const body: IDataObject = { participant };
			if (actingAdminId) body.actingAdminId = actingAdminId;

			return (await client.execute('addParticipantToConversation', { params: { id: conversationId }, body: body as never })) as IDataObject;
		}

		case 'removeParticipant': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const contactId = this.getNodeParameter('contactId', index) as string;
			const actingAdminId = extractId(this.getNodeParameter('actingAdminId', index, ''));

			const body: IDataObject = { id: contactId };
			if (actingAdminId) body.actingAdminId = actingAdminId;

			return (await client.execute('removeParticipantFromConversation', { params: { id: conversationId }, body: body as never })) as IDataObject;
		}

		case 'attachTag': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const tagId = this.getNodeParameter('tagId', index) as string;
			const actingAdminId = extractId(this.getNodeParameter('actingAdminId', index));

			return (await client.execute('attachConversationTag', {
				params: { id: conversationId },
				body: { tagId, actingAdminId } as never,
			})) as IDataObject;
		}

		case 'detachTag': {
			const conversationId = this.getNodeParameter('conversationId', index) as string;
			const tagId = this.getNodeParameter('tagId', index) as string;
			const actingAdminId = extractId(this.getNodeParameter('actingAdminId', index));
			return (await client.execute('detachConversationTag', {
				params: { id: conversationId, tagId },
				body: { actingAdminId } as never,
			})) as IDataObject;
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown conversation operation "${operation}"`, { itemIndex: index });
	}
}
