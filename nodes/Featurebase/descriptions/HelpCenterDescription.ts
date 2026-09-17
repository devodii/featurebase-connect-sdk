import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, resourceLocatorField, returnAllField, withContentText } from './shared';

export const helpCenterOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['helpCenterArticle'] } },
	default: 'getMany',
	options: [
		{ name: 'Get Many', value: 'getMany', description: 'List articles', action: 'Get many articles' },
		{ name: 'Get', value: 'get', description: 'Get an article by ID', action: 'Get an article' },
		{ name: 'Create', value: 'create', description: 'Create an article', action: 'Create an article' },
		{ name: 'Update', value: 'update', description: 'Update an article', action: 'Update an article' },
		{ name: 'Delete', value: 'delete', description: 'Delete an article', action: 'Delete an article' },
		{ name: 'Get Many Collections', value: 'getManyCollections', description: 'List collections', action: 'Get many collections' },
		{ name: 'Get Collection', value: 'getCollection', description: 'Get a collection by ID', action: 'Get a collection' },
		{ name: 'Create Collection', value: 'createCollection', description: 'Create a collection', action: 'Create a collection' },
		{ name: 'Update Collection', value: 'updateCollection', description: 'Update a collection', action: 'Update a collection' },
		{ name: 'Delete Collection', value: 'deleteCollection', description: 'Delete a collection', action: 'Delete a collection' },
	],
};

export const helpCenterFields: INodeProperties[] = [
	{
		displayName: 'Article ID',
		name: 'articleId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Collection ID',
		name: 'collectionId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['getCollection', 'updateCollection', 'deleteCollection'] } },
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['create'] } },
	},
	{
		displayName: 'Body (HTML)',
		name: 'body',
		type: 'string',
		typeOptions: { rows: 6 },
		default: '',
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['create', 'update'] } },
	},
	{
		displayName: 'Article Additional Fields',
		name: 'articleAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['create', 'update'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{
				...resourceLocatorField('parentId', 'Parent Collection', 'searchHelpCenterCollections', { required: false }),
			},
			{
				displayName: 'State',
				name: 'state',
				type: 'options',
				default: 'draft',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Live', value: 'live' },
				],
			},
			{
				displayName: 'Formatter',
				name: 'formatter',
				type: 'options',
				default: 'default',
				description: '"AI" converts markdown/HTML to Featurebase\'s format using AI',
				options: [
					{ name: 'Default', value: 'default' },
					{ name: 'AI', value: 'ai' },
				],
			},
		],
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['createCollection'] } },
	},
	{
		displayName: 'Collection Additional Fields',
		name: 'collectionAdditionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['createCollection', 'updateCollection'] } },
		options: [
			{ displayName: 'Description', name: 'description', type: 'string', default: '' },
			{
				...resourceLocatorField('parentId', 'Parent Collection', 'searchHelpCenterCollections', { required: false }),
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['getMany'] } },
		options: [
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
			{
				...resourceLocatorField('parentId', 'Parent Collection', 'searchHelpCenterCollections', { required: false }),
			},
			{ displayName: 'Help Center ID', name: 'helpCenterId', type: 'string', default: '' },
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['getMany', 'getManyCollections'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['helpCenterArticle'], operation: ['getMany', 'getManyCollections'], returnAll: [false] } },
	},
];

function extractId(value: unknown): string | undefined {
	if (!value) return undefined;
	if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
		const inner = (value as { value: unknown }).value;
		return inner ? String(inner) : undefined;
	}
	return String(value);
}

export async function executeHelpCenter(
	this: IExecuteFunctions,
	index: number,
	operation: string,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getMany': {
			const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
			const parentId = extractId(filters.parentId);
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);

			const qs: IDataObject = { ...filters };
			if (parentId) qs.parentId = parentId;

			const articles = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/help_center/articles', qs, returnAll, limit);
			return articles.map((article) => withContentText(article, 'body'));
		}

		case 'get': {
			const articleId = this.getNodeParameter('articleId', index) as string;
			const article = (await featurebaseApiRequest.call(this, 'GET', `/v2/help_center/articles/${articleId}`)) as IDataObject;
			return withContentText(article, 'body');
		}

		case 'create':
		case 'update': {
			const body = this.getNodeParameter('body', index, '') as string;
			const fields = this.getNodeParameter('articleAdditionalFields', index, {}) as IDataObject;

			const payload: IDataObject = {};
			if (operation === 'create') payload.title = this.getNodeParameter('title', index) as string;
			if (body) payload.body = body;
			if (fields.description) payload.description = fields.description;
			if (fields.state) payload.state = fields.state;
			if (fields.formatter) payload.formatter = fields.formatter;
			const parentId = extractId(fields.parentId);
			if (parentId) payload.parentId = parentId;

			const article =
				operation === 'create'
					? ((await featurebaseApiRequest.call(this, 'POST', '/v2/help_center/articles', payload)) as IDataObject)
					: ((await featurebaseApiRequest.call(
							this,
							'PATCH',
							`/v2/help_center/articles/${this.getNodeParameter('articleId', index) as string}`,
							payload,
					  )) as IDataObject);

			return withContentText(article, 'body');
		}

		case 'delete': {
			const articleId = this.getNodeParameter('articleId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/help_center/articles/${articleId}`);
		}

		case 'getManyCollections': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/help_center/collections', {}, returnAll, limit);
		}

		case 'getCollection': {
			const collectionId = this.getNodeParameter('collectionId', index) as string;
			return featurebaseApiRequest.call(this, 'GET', `/v2/help_center/collections/${collectionId}`);
		}

		case 'createCollection':
		case 'updateCollection': {
			const fields = this.getNodeParameter('collectionAdditionalFields', index, {}) as IDataObject;
			const payload: IDataObject = {};
			if (operation === 'createCollection') payload.name = this.getNodeParameter('name', index) as string;
			if (fields.description) payload.description = fields.description;
			const parentId = extractId(fields.parentId);
			if (parentId) payload.parentId = parentId;

			return operation === 'createCollection'
				? featurebaseApiRequest.call(this, 'POST', '/v2/help_center/collections', payload)
				: featurebaseApiRequest.call(
						this,
						'PATCH',
						`/v2/help_center/collections/${this.getNodeParameter('collectionId', index) as string}`,
						payload,
				  );
		}

		case 'deleteCollection': {
			const collectionId = this.getNodeParameter('collectionId', index) as string;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/help_center/collections/${collectionId}`);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown help center operation "${operation}"`, { itemIndex: index });
	}
}
