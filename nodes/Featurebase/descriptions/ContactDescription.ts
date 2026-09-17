import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, returnAllField } from './shared';

export const contactOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['contact'] } },
	default: 'getMany',
	options: [
		{ name: 'Get Many', value: 'getMany', description: 'List contacts', action: 'Get many contacts' },
		{ name: 'Get', value: 'get', description: 'Get a contact by ID', action: 'Get a contact' },
		{ name: 'Upsert', value: 'upsert', description: 'Create or update a contact by email or external user ID', action: 'Upsert a contact' },
		{ name: 'Delete', value: 'delete', description: 'Delete a contact by ID', action: 'Delete a contact' },
		{ name: 'Block', value: 'block', description: 'Block a contact', action: 'Block a contact' },
		{ name: 'Unblock', value: 'unblock', description: 'Unblock a contact', action: 'Unblock a contact' },
	],
};

export const contactFields: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['contact'], operation: ['get', 'delete', 'block', 'unblock'] } },
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
		description: 'Used for identification if External User ID is not provided',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
		options: [
			{
				displayName: 'External User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'Takes precedence over email for identification',
			},
			{ displayName: 'Name', name: 'name', type: 'string', default: '' },
			{ displayName: 'Profile Picture URL', name: 'profilePicture', type: 'string', default: '' },
			{ displayName: 'Phone', name: 'phone', type: 'string', default: '' },
			{ displayName: 'Locale', name: 'locale', type: 'string', default: '' },
			{ displayName: 'Subscribed to Changelog', name: 'subscribedToChangelog', type: 'boolean', default: false },
			{ displayName: 'Created At', name: 'createdAt', type: 'dateTime', default: '' },
			{
				displayName: 'User Hash',
				name: 'userHash',
				type: 'string',
				default: '',
				description: 'HMAC-SHA256 hash of userId or email, for Featurebase Identity Verification',
			},
			{
				displayName: 'Role IDs',
				name: 'roles',
				type: 'string',
				default: '',
				description: 'Comma-separated role IDs to assign',
			},
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFields',
				type: 'json',
				default: '{}',
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['contact'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Contact Type',
				name: 'contactType',
				type: 'options',
				default: 'customer',
				options: [
					{ name: 'Customer', value: 'customer' },
					{ name: 'Lead', value: 'lead' },
					{ name: 'All', value: 'all' },
				],
			},
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['contact'], operation: ['getMany'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['contact'], operation: ['getMany'], returnAll: [false] } },
	},
];

function splitCommaList(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export async function executeContact(
	this: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getMany': {
			const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/contacts', filters, returnAll, limit);
		}

		case 'get': {
			const contactId = this.getNodeParameter('contactId', index) as string;
			return featurebaseApiRequest.call(this, 'GET', `/v2/contacts/${contactId}`);
		}

		case 'upsert': {
			const email = this.getNodeParameter('email', index, '') as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = {};
			if (email) body.email = email;

			for (const key of ['userId', 'name', 'profilePicture', 'phone', 'locale', 'subscribedToChangelog', 'createdAt', 'userHash']) {
				if (additionalFields[key] !== undefined && additionalFields[key] !== '') body[key] = additionalFields[key];
			}

			const roles = splitCommaList(additionalFields.roles);
			if (roles) body.roles = roles;

			if (additionalFields.customFields && additionalFields.customFields !== '{}') {
				body.customFields =
					typeof additionalFields.customFields === 'string'
						? JSON.parse(additionalFields.customFields)
						: additionalFields.customFields;
			}

			return featurebaseApiRequest.call(this, 'POST', '/v2/contacts', body);
		}

		case 'delete': {
			const contactId = this.getNodeParameter('contactId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/contacts/${contactId}`);
		}

		case 'block':
		case 'unblock': {
			const contactId = this.getNodeParameter('contactId', index) as string;
			return featurebaseApiRequest.call(this, 'POST', `/v2/contacts/${contactId}/${operation}`);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown contact operation "${operation}"`, { itemIndex: index });
	}
}
