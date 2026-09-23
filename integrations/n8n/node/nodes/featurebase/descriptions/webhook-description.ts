import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getFeaturebaseClient } from '../featurebase-client';
import { extractItems, limitField, pick, returnAllField, simplifyField } from './shared';
import { WEBHOOK_TOPICS } from './webhook-topics';

const WEBHOOK_SIMPLIFY_FIELDS = ['id', 'name', 'url', 'topics', 'status', 'secret', 'health'];

export const webhookOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['webhook'] } },
	default: 'getMany',
	options: [
		{ name: 'Create', value: 'create', description: 'Create a webhook endpoint', action: 'Create a webhook' },
		{ name: 'Delete', value: 'delete', description: 'Delete a webhook endpoint', action: 'Delete a webhook' },
		{ name: 'Get', value: 'get', description: 'Get a webhook by ID', action: 'Get a webhook' },
		{ name: 'Get Many', value: 'getMany', description: 'List webhook endpoints', action: 'Get many webhooks' },
		{
			name: 'Refresh Secret',
			value: 'refreshSecret',
			description: 'Generate a new signing secret, invalidating the old one',
			action: 'Refresh a webhook secret',
		},
		{ name: 'Update', value: 'update', description: 'Update a webhook endpoint', action: 'Update a webhook' },
	],
};

export const webhookFields: INodeProperties[] = [
	{
		displayName: 'Webhook ID',
		name: 'webhookId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['webhook'], operation: ['get', 'update', 'delete', 'refreshSecret'] } },
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
		description: 'Must be a publicly accessible HTTPS URL',
	},
	{
		displayName: 'Topics',
		name: 'topics',
		type: 'multiOptions',
		default: [],
		required: true,
		displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
		options: WEBHOOK_TOPICS.map(({ name, value, group }) => ({ name: `${group}: ${name}`, value })),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['webhook'], operation: ['create'] } },
		options: [{ displayName: 'Description', name: 'description', type: 'string', default: '' }],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['webhook'], operation: ['update'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'active',
				description: 'Reactivating resets health metrics after a webhook has been auto-paused for delivery failures',
				options: [
					{ name: 'Active', value: 'active' },
					{ name: 'Paused', value: 'paused' },
				],
			},
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'multiOptions',
				default: [],
				options: WEBHOOK_TOPICS.map(({ name, value, group }) => ({ name: `${group}: ${name}`, value })),
			},
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['webhook'], operation: ['getMany'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['webhook'], operation: ['getMany'], returnAll: [false] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['webhook'], operation: ['get', 'getMany', 'create', 'update', 'refreshSecret'] } },
	},
];

export async function executeWebhook(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const client = await getFeaturebaseClient(this);
	const simplify = ['get', 'getMany', 'create', 'update', 'refreshSecret'].includes(operation)
		? (this.getNodeParameter('simplify', index, true) as boolean)
		: false;
	const finalize = (webhook: IDataObject): IDataObject => (simplify ? pick(webhook, WEBHOOK_SIMPLIFY_FIELDS) : webhook);

	switch (operation) {
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? 100 : (this.getNodeParameter('limit', index) as number);
			const webhooks = extractItems(await client.execute('listWebhooks', { query: { limit } }));
			return webhooks.map(finalize);
		}

		case 'get': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			const webhook = (await client.execute('getWebhookById', { params: { id: webhookId } })) as IDataObject;
			return finalize(webhook);
		}

		case 'create': {
			const name = this.getNodeParameter('name', index) as string;
			const url = this.getNodeParameter('url', index) as string;
			const topics = this.getNodeParameter('topics', index, []) as string[];
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = { name, url, topics, ...additionalFields };
			const webhook = (await client.execute('createWebhook', { body: body as never })) as IDataObject;
			return finalize(webhook);
		}

		case 'update': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as IDataObject;
			const webhook = (await client.execute('updateWebhook', { params: { id: webhookId }, body: updateFields as never })) as IDataObject;
			return finalize(webhook);
		}

		case 'delete': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			return (await client.execute('deleteWebhook', { params: { id: webhookId } })) as IDataObject;
		}

		case 'refreshSecret': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			const webhook = (await client.execute('refreshWebhookSecret', { params: { id: webhookId } })) as IDataObject;
			return finalize(webhook);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown webhook operation "${operation}"`, { itemIndex: index });
	}
}
