import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, returnAllField } from './shared';
import { WEBHOOK_TOPICS } from './webhookTopics';

export const webhookOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['webhook'] } },
	default: 'getMany',
	options: [
		{ name: 'Get Many', value: 'getMany', description: 'List webhook endpoints', action: 'Get many webhooks' },
		{ name: 'Get', value: 'get', description: 'Get a webhook by ID', action: 'Get a webhook' },
		{ name: 'Create', value: 'create', description: 'Create a webhook endpoint', action: 'Create a webhook' },
		{ name: 'Update', value: 'update', description: 'Update a webhook endpoint', action: 'Update a webhook' },
		{ name: 'Delete', value: 'delete', description: 'Delete a webhook endpoint', action: 'Delete a webhook' },
		{
			name: 'Refresh Secret',
			value: 'refreshSecret',
			description: 'Generate a new signing secret, invalidating the old one',
			action: 'Refresh a webhook secret',
		},
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
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'URL', name: 'url', type: 'string', default: '' },
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'multiOptions',
				default: [],
				options: WEBHOOK_TOPICS.map(({ name, value, group }) => ({ name: `${group}: ${name}`, value })),
			},
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
];

export async function executeWebhook(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/webhooks', {}, returnAll, limit);
		}

		case 'get': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			return featurebaseApiRequest.call(this, 'GET', `/v2/webhooks/${webhookId}`);
		}

		case 'create': {
			const name = this.getNodeParameter('name', index) as string;
			const url = this.getNodeParameter('url', index) as string;
			const topics = this.getNodeParameter('topics', index, []) as string[];
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = { name, url, topics, ...additionalFields };
			return featurebaseApiRequest.call(this, 'POST', '/v2/webhooks', body);
		}

		case 'update': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as IDataObject;
			return featurebaseApiRequest.call(this, 'PATCH', `/v2/webhooks/${webhookId}`, updateFields);
		}

		case 'delete': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/webhooks/${webhookId}`);
		}

		case 'refreshSecret': {
			const webhookId = this.getNodeParameter('webhookId', index) as string;
			return featurebaseApiRequest.call(this, 'POST', `/v2/webhooks/${webhookId}/secret`);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown webhook operation "${operation}"`, { itemIndex: index });
	}
}
