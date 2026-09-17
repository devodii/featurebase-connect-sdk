import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, markdownToggleField, returnAllField, withContentText } from './shared';

export const changelogOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['changelog'] } },
	default: 'getMany',
	options: [
		{ name: 'Add Subscribers', value: 'addSubscribers', description: 'Subscribe emails to the changelog', action: 'Add changelog subscribers' },
		{ name: 'Create', value: 'create', description: 'Create a draft changelog', action: 'Create a changelog' },
		{ name: 'Delete', value: 'delete', description: 'Delete a changelog', action: 'Delete a changelog' },
		{ name: 'Get', value: 'get', description: 'Get a changelog by ID or slug', action: 'Get a changelog' },
		{ name: 'Get Many', value: 'getMany', description: 'List changelogs', action: 'Get many changelogs' },
		{ name: 'Publish', value: 'publish', description: 'Publish a draft changelog', action: 'Publish a changelog' },
		{ name: 'Remove Subscribers', value: 'removeSubscribers', description: 'Unsubscribe emails from the changelog', action: 'Remove changelog subscribers' },
		{ name: 'Unpublish', value: 'unpublish', description: 'Move a changelog back to draft', action: 'Unpublish a changelog' },
		{ name: 'Update', value: 'update', description: 'Update a changelog', action: 'Update a changelog' },
	],
};

export const changelogFields: INodeProperties[] = [
	{
		displayName: 'Changelog ID',
		name: 'changelogId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['changelog'], operation: ['get', 'update', 'publish', 'unpublish', 'delete'] } },
		description: 'The changelog ID or slug',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['changelog'], operation: ['create'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '',
		displayOptions: { show: { resource: ['changelog'], operation: ['create', 'update'] } },
		description: 'The Featurebase API accepts markdown content directly for changelogs, so no client-side conversion is needed',
	},
	{
		...markdownToggleField,
		default: true,
		description: 'Whether Content is markdown (sent as markdownContent) or HTML (sent as htmlContent)',
		displayOptions: { show: { resource: ['changelog'], operation: ['create', 'update'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['changelog'], operation: ['create', 'update'] } },
		options: [
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'string',
				default: '',
				description: 'Comma-separated category names (e.g. New, Fixed, Improved)',
			},
			{
				displayName: 'Featured Image URL',
				name: 'featuredImage',
				type: 'string',
				default: '',
			},
		],
	},
	{
		displayName: 'Publish Options',
		name: 'publishOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['changelog'], operation: ['publish'] } },
		options: [
			{ displayName: 'Send Email to Subscribers', name: 'sendEmail', type: 'boolean', default: false },
			{
				displayName: 'Locales',
				name: 'locales',
				type: 'string',
				default: '',
				description: 'Comma-separated locale codes to publish to (e.g. en,de). Leave empty to publish to all locales.',
			},
			{
				displayName: 'Scheduled Date',
				name: 'scheduledDate',
				type: 'dateTime',
				default: '',
				description: 'Publish at a future date instead of immediately',
			},
		],
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['changelog'], operation: ['addSubscribers', 'removeSubscribers'] } },
		description: 'Comma-separated list of email addresses',
	},
	{
		displayName: 'Locale',
		name: 'locale',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['changelog'], operation: ['addSubscribers'] } },
		description: 'Locale for the subscription. Defaults to the organization default locale.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['changelog'], operation: ['getMany'] } },
		options: [
			{ displayName: 'Categories', name: 'categories', type: 'string', default: '', description: 'Comma-separated category names' },
			{ displayName: 'End Date', name: 'endDate', type: 'dateTime', default: '' },
			{ displayName: 'Locale', name: 'locale', type: 'string', default: '' },
			{ displayName: 'Query', name: 'q', type: 'string', default: '' },
			{ displayName: 'Start Date', name: 'startDate', type: 'dateTime', default: '' },
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'live',
				options: [
					{ name: 'Live', value: 'live' },
					{ name: 'Draft', value: 'draft' },
					{ name: 'All', value: 'all' },
				],
			},
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['changelog'], operation: ['getMany'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['changelog'], operation: ['getMany'], returnAll: [false] } },
	},
];

function splitCommaList(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || value.trim() === '') return undefined;
	return value
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);
}

export async function executeChangelog(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getMany': {
			const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
			const categories = splitCommaList(filters.categories);
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);

			const qs: IDataObject = { ...filters };
			if (categories) qs.categories = categories;

			const changelogs = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/changelogs', qs, returnAll, limit);
			return changelogs.map((changelog) => withContentText(changelog));
		}

		case 'get': {
			const changelogId = this.getNodeParameter('changelogId', index) as string;
			const changelog = (await featurebaseApiRequest.call(this, 'GET', `/v2/changelogs/${changelogId}`)) as IDataObject;
			return withContentText(changelog);
		}

		case 'create':
		case 'update': {
			const useMarkdown = this.getNodeParameter('markdown', index, true) as boolean;
			const content = this.getNodeParameter('content', index, '') as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = {};
			if (operation === 'create') body.title = this.getNodeParameter('title', index) as string;
			if (content) body[useMarkdown ? 'markdownContent' : 'htmlContent'] = content;

			const categories = splitCommaList(additionalFields.categories);
			if (categories) body.categories = categories;
			if (additionalFields.featuredImage) body.featuredImage = additionalFields.featuredImage;

			const changelog =
				operation === 'create'
					? ((await featurebaseApiRequest.call(this, 'POST', '/v2/changelogs', body)) as IDataObject)
					: ((await featurebaseApiRequest.call(this, 'PATCH', `/v2/changelogs/${this.getNodeParameter('changelogId', index) as string}`, body)) as IDataObject);

			return withContentText(changelog);
		}

		case 'publish': {
			const changelogId = this.getNodeParameter('changelogId', index) as string;
			const options = this.getNodeParameter('publishOptions', index, {}) as IDataObject;
			const body: IDataObject = {};
			if (options.sendEmail !== undefined) body.sendEmail = options.sendEmail;
			const locales = splitCommaList(options.locales);
			if (locales) body.locales = locales;
			if (options.scheduledDate) body.scheduledDate = options.scheduledDate;

			const changelog = (await featurebaseApiRequest.call(this, 'POST', `/v2/changelogs/${changelogId}/publish`, body)) as IDataObject;
			return withContentText(changelog);
		}

		case 'unpublish': {
			const changelogId = this.getNodeParameter('changelogId', index) as string;
			return featurebaseApiRequest.call(this, 'POST', `/v2/changelogs/${changelogId}/unpublish`);
		}

		case 'delete': {
			const changelogId = this.getNodeParameter('changelogId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/changelogs/${changelogId}`);
		}

		case 'addSubscribers':
		case 'removeSubscribers': {
			const emails = splitCommaList(this.getNodeParameter('emails', index) as string) ?? [];
			const body: IDataObject = { emails };
			if (operation === 'addSubscribers') {
				const locale = this.getNodeParameter('locale', index, '') as string;
				if (locale) body.locale = locale;
			}
			const method = operation === 'addSubscribers' ? 'POST' : 'DELETE';
			return featurebaseApiRequest.call(this, method, '/v2/changelogs/subscribers', body);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown changelog operation "${operation}"`, { itemIndex: index });
	}
}
