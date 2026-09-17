import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, pick, returnAllField, simplifyField } from './shared';

const COMPANY_SIMPLIFY_FIELDS = ['id', 'companyId', 'name', 'monthlySpend', 'industry', 'website', 'plan', 'companySize'];

export const companyOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['company'] } },
	default: 'getMany',
	options: [
		{ name: 'Attach Contact', value: 'attachContact', description: 'Attach a contact to a company', action: 'Attach a contact to a company' },
		{
			name: 'Create or Update',
			value: 'upsert',
			description: 'Create a new record, or update the current one if it already exists (upsert)',
			action: 'Upsert a company',
		},
		{ name: 'Delete', value: 'delete', description: 'Delete a company by ID', action: 'Delete a company' },
		{ name: 'Detach Contact', value: 'detachContact', description: 'Remove a contact from a company', action: 'Detach a contact from a company' },
		{ name: 'Get', value: 'get', description: 'Get a company by ID', action: 'Get a company' },
		{ name: 'Get Many', value: 'getMany', description: 'List companies', action: 'Get many companies' },
		{ name: 'List Contacts', value: 'listContacts', description: 'List contacts attached to a company', action: 'List company contacts' },
	],
};

export const companyFields: INodeProperties[] = [
	{
		displayName: 'Company ID',
		name: 'companyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['company'], operation: ['get', 'delete', 'listContacts', 'attachContact', 'detachContact'] } },
		description: 'The Featurebase company ID',
	},
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['company'], operation: ['attachContact', 'detachContact'] } },
	},
	{
		displayName: 'External Company ID',
		name: 'externalCompanyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['company'], operation: ['upsert'] } },
		description: 'Used as the unique identifier for upsert matching',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['company'], operation: ['upsert'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['company'], operation: ['upsert'] } },
		options: [
			{ displayName: 'Company Size', name: 'companySize', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
			{ displayName: 'Created At', name: 'createdAt', type: 'dateTime', default: '' },
			{ displayName: 'Custom Fields (JSON)', name: 'customFields', type: 'json', default: '{}' },
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{ displayName: 'Monthly Spend', name: 'monthlySpend', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
			{ displayName: 'Plan', name: 'plan', type: 'string', default: '' },
			{ displayName: 'Website', name: 'website', type: 'string', default: '' },
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['company'], operation: ['getMany', 'listContacts'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['company'], operation: ['getMany', 'listContacts'], returnAll: [false] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['company'], operation: ['get', 'getMany', 'upsert'] } },
	},
];

export async function executeCompany(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const simplify = ['get', 'getMany', 'upsert'].includes(operation) ? (this.getNodeParameter('simplify', index, true) as boolean) : false;
	const finalize = (company: IDataObject): IDataObject => (simplify ? pick(company, COMPANY_SIMPLIFY_FIELDS) : company);

	switch (operation) {
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			const companies = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/companies', {}, returnAll, limit);
			return companies.map(finalize);
		}

		case 'get': {
			const companyId = this.getNodeParameter('companyId', index) as string;
			const company = (await featurebaseApiRequest.call(this, 'GET', `/v2/companies/${companyId}`)) as IDataObject;
			return finalize(company);
		}

		case 'upsert': {
			const companyId = this.getNodeParameter('externalCompanyId', index) as string;
			const name = this.getNodeParameter('name', index) as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = { companyId, name };
			for (const key of ['monthlySpend', 'industry', 'website', 'plan', 'companySize', 'createdAt']) {
				if (additionalFields[key] !== undefined && additionalFields[key] !== '') body[key] = additionalFields[key];
			}
			if (additionalFields.customFields && additionalFields.customFields !== '{}') {
				body.customFields = typeof additionalFields.customFields === 'string' ? JSON.parse(additionalFields.customFields) : additionalFields.customFields;
			}

			const company = (await featurebaseApiRequest.call(this, 'POST', '/v2/companies', body)) as IDataObject;
			return finalize(company);
		}

		case 'delete': {
			const companyId = this.getNodeParameter('companyId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/companies/${companyId}`);
		}

		case 'listContacts': {
			const companyId = this.getNodeParameter('companyId', index) as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, `/v2/companies/${companyId}/contacts`, {}, returnAll, limit);
		}

		case 'attachContact': {
			const companyId = this.getNodeParameter('companyId', index) as string;
			const contactId = this.getNodeParameter('contactId', index) as string;
			return featurebaseApiRequest.call(this, 'POST', `/v2/companies/${companyId}/contacts`, { contactId });
		}

		case 'detachContact': {
			const companyId = this.getNodeParameter('companyId', index) as string;
			const contactId = this.getNodeParameter('contactId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/companies/${companyId}/contacts/${contactId}`);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown company operation "${operation}"`, { itemIndex: index });
	}
}
