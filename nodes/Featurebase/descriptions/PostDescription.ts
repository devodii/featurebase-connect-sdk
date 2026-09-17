import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { markdownToHtml } from '../utils/markdown';
import {
	authorCollectionField,
	cleanAuthorInput,
	extractId,
	limitField,
	markdownToggleField,
	resourceLocatorField,
	returnAllField,
	simplifyField,
	withContentText,
} from './shared';

const integrationsField: INodeProperties = {
	displayName: 'Push to Integrations',
	name: 'integrations',
	type: 'collection',
	placeholder: 'Add Integration',
	default: {},
	description: 'Push the created post to third-party integrations configured on your organization (reference/FINDINGS.md section 9)',
	options: [
		{ displayName: 'Linear', name: 'linear', type: 'boolean', default: false },
		{ displayName: 'ClickUp', name: 'clickup', type: 'boolean', default: false },
		{ displayName: 'GitHub', name: 'github', type: 'boolean', default: false },
		{ displayName: 'Jira', name: 'jira', type: 'boolean', default: false },
		{ displayName: 'Discord', name: 'discord', type: 'boolean', default: false },
		{ displayName: 'Slack', name: 'slack', type: 'boolean', default: false },
	],
};

function postFieldsCollection(forCreate: boolean): INodeProperties[] {
	return [
		{
			displayName: 'Tags',
			name: 'tags',
			type: 'multiOptions',
			typeOptions: { loadOptionsMethod: 'getPostTags' },
			default: [],
			description: 'Tag names to attach (replaces existing on update). Switch to Expression mode to use tag names that do not exist yet.',
		},
		resourceLocatorField('statusId', 'Status', 'searchPostStatuses', {
			required: false,
			description: 'Status to set on the post',
		}),
		authorCollectionField('author', 'Author'),
		{
			displayName: 'In Review',
			name: 'inReview',
			type: 'boolean',
			default: false,
			description: 'Whether the post is pending moderation',
		},
		{
			displayName: 'Custom Fields',
			name: 'customFields',
			type: 'fixedCollection',
			typeOptions: { multipleValues: true },
			placeholder: 'Add Custom Field',
			default: {},
			options: [
				{
					displayName: 'Field',
					name: 'field',
					values: [
						{
							displayName: 'Field',
							name: 'fieldId',
							type: 'options',
							typeOptions: { loadOptionsMethod: 'getCustomFields' },
							default: '',
						},
						{
							displayName: 'Value',
							name: 'value',
							type: 'string',
							default: '',
							description: 'String, number, boolean, or date value. Use an expression for non-string types.',
						},
					],
				},
			],
		},
		{
			displayName: 'ETA',
			name: 'eta',
			type: 'dateTime',
			default: '',
			description: 'Estimated completion date',
		},
		resourceLocatorField('assigneeId', 'Assignee', 'searchAdmins', {
			required: false,
			description: 'Admin to assign this post to',
		}),
		{
			displayName: 'Visibility',
			name: 'visibility',
			type: 'options',
			default: 'public',
			options: [
				{ name: 'Public', value: 'public' },
				{ name: 'Author Only', value: 'authorOnly' },
				{ name: 'Company Only', value: 'companyOnly' },
			],
		},
		{
			displayName: 'Initial Upvotes',
			name: 'upvotes',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 1,
			description: 'Initial upvote count. Defaults to 1 (author auto-voted); use 0 for none.',
		},
		{
			displayName: 'Created At',
			name: 'createdAt',
			type: 'dateTime',
			default: '',
			description: 'Backdate the post creation date, useful for migrations',
		},
		{
			displayName: 'Comments Enabled',
			name: 'commentsEnabled',
			type: 'boolean',
			default: true,
		},
		{
			displayName: 'Notify Admins',
			name: 'notifyAdmins',
			type: 'boolean',
			default: false,
			description: 'Whether to email admins as if the post was created from the dashboard',
		},
		...(forCreate ? [integrationsField] : []),
		...(forCreate
			? []
			: [
					{
						displayName: 'Send Status Update Email',
						name: 'sendStatusUpdateEmail',
						type: 'boolean' as const,
						default: false,
					},
				]),
	];
}

export const postOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['post'] } },
	default: 'getMany',
	options: [
		{ name: 'Get Many', value: 'getMany', description: 'List posts with filters', action: 'Get many posts' },
		{ name: 'Get', value: 'get', description: 'Get a post by ID', action: 'Get a post' },
		{ name: 'Get by Slug', value: 'getBySlug', description: 'Get a post by its URL slug', action: 'Get a post by slug' },
		{ name: 'Search', value: 'search', description: 'Search posts by text', action: 'Search posts' },
		{ name: 'Create', value: 'create', description: 'Create a new post', action: 'Create a post' },
		{ name: 'Update', value: 'update', description: 'Update a post', action: 'Update a post' },
		{ name: 'Delete', value: 'delete', description: 'Delete a post', action: 'Delete a post' },
		{ name: 'Add Upvoter', value: 'addUpvoter', description: 'Add a voter to a post', action: 'Add an upvoter to a post' },
		{ name: 'Remove Upvoter', value: 'removeUpvoter', description: 'Remove a voter from a post', action: 'Remove an upvoter from a post' },
		{ name: 'Get Upvoters', value: 'getUpvoters', description: 'List voters on a post', action: 'Get upvoters for a post' },
	],
};

const postIdField = resourceLocatorField('postId', 'Post', 'searchPosts', { description: 'The post to act on' });

export const postFields: INodeProperties[] = [
	{
		...postIdField,
		displayOptions: {
			show: { resource: ['post'], operation: ['get', 'update', 'delete', 'addUpvoter', 'removeUpvoter', 'getUpvoters'] },
		},
	},
	{
		displayName: 'Slug',
		name: 'slug',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['post'], operation: ['getBySlug'] } },
		description: 'The post slug, from its public URL (e.g. add-dark-mode-support)',
	},
	{
		displayName: 'Query',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['post'], operation: ['search'] } },
		description: 'Text to search for in post titles and content',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		...resourceLocatorField('boardId', 'Board', 'searchBoards', { description: 'Board to create the post in' }),
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['post'], operation: ['create', 'update'] } },
	},
	{
		...markdownToggleField,
		displayOptions: { show: { resource: ['post'], operation: ['create', 'update'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['create'] } },
		options: postFieldsCollection(true),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['update'] } },
		options: postFieldsCollection(false),
	},
	{
		...authorCollectionField('voter', 'Voter'),
		displayOptions: { show: { resource: ['post'], operation: ['addUpvoter', 'removeUpvoter'] } },
		description: 'Identify the voter to add or remove. For removal, only Featurebase User ID, External User ID, and Email apply.',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['post'], operation: ['getMany'] } },
		options: [
			{
				displayName: 'Board Names or IDs',
				name: 'boardId',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getBoards' },
				default: [],
				description: 'Choose from the list, or specify IDs using an expression',
			},
			{
				displayName: 'Status Names or IDs',
				name: 'statusId',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getPostStatuses' },
				default: [],
				description: 'Choose from the list, or specify IDs using an expression',
			},
			{ displayName: 'Tag Names or IDs', name: 'tags', type: 'multiOptions', typeOptions: { loadOptionsMethod: 'getPostTags' }, default: [] },
			{ displayName: 'Query', name: 'q', type: 'string', default: '', description: 'Filter posts by title/content text' },
			{ displayName: 'Include In-Review Posts', name: 'inReview', type: 'boolean', default: false },
		],
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		default: 'createdAt',
		displayOptions: { show: { resource: ['post'], operation: ['getMany'] } },
		options: [
			{ name: 'Created At', value: 'createdAt' },
			{ name: 'Upvotes', value: 'upvotes' },
			{ name: 'Trending', value: 'trending' },
			{ name: 'Recent Activity', value: 'recent' },
		],
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		default: 'trending',
		displayOptions: { show: { resource: ['post'], operation: ['search'] } },
		options: [
			{ name: 'Created At', value: 'createdAt' },
			{ name: 'Upvotes', value: 'upvotes' },
			{ name: 'Trending', value: 'trending' },
			{ name: 'Recent Activity', value: 'recent' },
		],
	},
	{
		displayName: 'Sort Order',
		name: 'sortOrder',
		type: 'options',
		default: 'desc',
		displayOptions: { show: { resource: ['post'], operation: ['getMany', 'search'] } },
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['post'], operation: ['getMany', 'search', 'getUpvoters'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['post'], operation: ['getMany', 'search', 'getUpvoters'], returnAll: [false] } },
	},
	{
		...simplifyField,
		displayOptions: { show: { resource: ['post'], operation: ['get', 'getMany', 'getBySlug', 'search', 'create', 'update'] } },
	},
];

function simplifyPost(post: IDataObject): IDataObject {
	return {
		id: post.id,
		title: post.title,
		slug: post.slug,
		postUrl: post.postUrl,
		boardId: post.boardId,
		status: (post.status as IDataObject)?.name,
		tags: ((post.tags as IDataObject[]) ?? []).map((tag) => tag.name),
		upvotes: post.upvotes,
		commentCount: post.commentCount,
		author: (post.author as IDataObject)?.name,
		assigneeId: post.assigneeId,
		eta: post.eta,
		createdAt: post.createdAt,
		updatedAt: post.updatedAt,
		content: post.content,
	};
}

function buildPostBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};

	for (const key of ['inReview', 'eta', 'visibility', 'upvotes', 'createdAt', 'commentsEnabled', 'notifyAdmins', 'sendStatusUpdateEmail']) {
		if (fields[key] !== undefined && fields[key] !== '') body[key] = fields[key];
	}

	if (Array.isArray(fields.tags) && fields.tags.length > 0) body.tags = fields.tags;
	if (fields.statusId) body.statusId = extractId(fields.statusId);
	if (fields.assigneeId) body.assigneeId = extractId(fields.assigneeId);

	const author = cleanAuthorInput(fields.author as IDataObject);
	if (author) body.author = author;

	const integrations = fields.integrations as IDataObject | undefined;
	if (integrations && Object.keys(integrations).length > 0) body.integrations = integrations;

	const customFieldRows = ((fields.customFields as IDataObject)?.field as IDataObject[]) ?? [];
	if (customFieldRows.length > 0) {
		body.customFields = customFieldRows.reduce<IDataObject>((acc, row) => {
			acc[row.fieldId as string] = row.value;
			return acc;
		}, {});
	}

	return body;
}

export async function executePost(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const simplify = ['get', 'getMany', 'getBySlug', 'search', 'create', 'update'].includes(operation)
		? (this.getNodeParameter('simplify', index, true) as boolean)
		: false;
	const useMarkdown = ['create', 'update'].includes(operation) ? (this.getNodeParameter('markdown', index, true) as boolean) : false;

	const finalize = (post: IDataObject): IDataObject => {
		const withText = withContentText(post);
		return simplify ? simplifyPost(withText) : withText;
	};

	switch (operation) {
		case 'getMany': {
			const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
			const sortBy = this.getNodeParameter('sortBy', index) as string;
			const sortOrder = this.getNodeParameter('sortOrder', index) as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);

			const qs: IDataObject = { sortBy, sortOrder, ...filters };
			const posts = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/posts', qs, returnAll, limit);
			return posts.map(finalize);
		}

		case 'get': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const post = (await featurebaseApiRequest.call(this, 'GET', `/v2/posts/${postId}`)) as IDataObject;
			return finalize(post);
		}

		case 'getBySlug': {
			const slug = this.getNodeParameter('slug', index) as string;
			const results = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/posts', { q: slug, limit: 20 }, false, 20);
			const match = results.find((post) => post.slug === slug) ?? results[0];
			if (!match) {
				throw new NodeOperationError(this.getNode(), `No post found with slug "${slug}"`, { itemIndex: index });
			}
			return finalize(match);
		}

		case 'search': {
			const q = this.getNodeParameter('q', index) as string;
			const sortBy = this.getNodeParameter('sortBy', index) as string;
			const sortOrder = this.getNodeParameter('sortOrder', index) as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);

			const posts = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/posts', { q, sortBy, sortOrder }, returnAll, limit);
			return posts.map(finalize);
		}

		case 'create': {
			const title = this.getNodeParameter('title', index) as string;
			const boardId = extractId(this.getNodeParameter('boardId', index));
			const content = this.getNodeParameter('content', index, '') as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = {
				title,
				boardId,
				content: useMarkdown ? markdownToHtml(content) : content,
				...buildPostBody(additionalFields),
			};

			const post = (await featurebaseApiRequest.call(this, 'POST', '/v2/posts', body)) as IDataObject;
			return finalize(post);
		}

		case 'update': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const content = this.getNodeParameter('content', index, '') as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as IDataObject;

			const body: IDataObject = buildPostBody(updateFields);
			if (content) body.content = useMarkdown ? markdownToHtml(content) : content;

			const post = (await featurebaseApiRequest.call(this, 'PATCH', `/v2/posts/${postId}`, body)) as IDataObject;
			return finalize(post);
		}

		case 'delete': {
			const postId = extractId(this.getNodeParameter('postId', index));
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/posts/${postId}`);
		}

		case 'addUpvoter': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const voter = cleanAuthorInput(this.getNodeParameter('voter', index, {}) as IDataObject) ?? {};
			return featurebaseApiRequest.call(this, 'POST', `/v2/posts/${postId}/voters`, voter);
		}

		case 'removeUpvoter': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const voter = cleanAuthorInput(this.getNodeParameter('voter', index, {}) as IDataObject) ?? {};
			const { name, profilePicture, ...removable } = voter;
			void name;
			void profilePicture;
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/posts/${postId}/voters`, removable);
		}

		case 'getUpvoters': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, `/v2/posts/${postId}/voters`, {}, returnAll, limit);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown post operation "${operation}"`, { itemIndex: index });
	}
}
