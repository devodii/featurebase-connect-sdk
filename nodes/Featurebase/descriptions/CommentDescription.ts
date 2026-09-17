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
	withContentText,
} from './shared';

export const commentOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['comment'] } },
	default: 'getMany',
	options: [
		{ name: 'Create', value: 'create', description: 'Create a comment or reply', action: 'Create a comment' },
		{ name: 'Delete', value: 'delete', description: 'Delete a comment', action: 'Delete a comment' },
		{ name: 'Get', value: 'get', description: 'Get a comment by ID', action: 'Get a comment' },
		{ name: 'Get Many', value: 'getMany', description: 'List comments on a post or changelog', action: 'Get many comments' },
		{ name: 'Update', value: 'update', description: 'Update a comment', action: 'Update a comment' },
	],
};

const commentIdField = resourceLocatorField('commentId', 'Comment', 'searchComments', {
	description: 'The comment to act on',
});

export const commentFields: INodeProperties[] = [
	{
		...commentIdField,
		displayOptions: { show: { resource: ['comment'], operation: ['get', 'update', 'delete'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show: { resource: ['comment'], operation: ['create', 'update'] } },
	},
	{
		...markdownToggleField,
		displayOptions: { show: { resource: ['comment'], operation: ['create', 'update'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['comment'], operation: ['create'] } },
		options: [
			{
				...resourceLocatorField('postId', 'Post', 'searchPosts', { required: false }),
				description: 'Post to comment on (leave empty if commenting on a changelog)',
			},
			authorCollectionField('author', 'Author'),
			{
				displayName: 'Changelog ID',
				name: 'changelogId',
				type: 'string',
				default: '',
				description: 'Changelog to comment on (leave empty if commenting on a post)',
			},
			{
				displayName: 'Created At',
				name: 'createdAt',
				type: 'dateTime',
				default: '',
				description: 'Backdate the comment creation date, useful for migrations',
			},
			{
				displayName: 'Initial Downvotes',
				name: 'downvotes',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
			},
			{
				displayName: 'Initial Upvotes',
				name: 'upvotes',
				type: 'number',
				typeOptions: { minValue: 0 },
				default: 0,
			},
			{
				displayName: 'Parent Comment ID',
				name: 'parentCommentId',
				type: 'string',
				default: '',
				description: 'Set to reply to an existing comment',
			},
			{
				displayName: 'Private (Internal Note)',
				name: 'isPrivate',
				type: 'boolean',
				default: false,
				description: 'Whether the comment is only visible to admins',
			},
			{
				displayName: 'Send Notification',
				name: 'sendNotification',
				type: 'boolean',
				default: true,
				description: 'Whether to notify voters about the new comment',
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['comment'], operation: ['update'] } },
		options: [
			{ displayName: 'Created At', name: 'createdAt', type: 'dateTime', default: '' },
			{ displayName: 'Downvotes', name: 'downvotes', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
			{ displayName: 'In Review', name: 'inReview', type: 'boolean', default: false },
			{ displayName: 'Pinned', name: 'isPinned', type: 'boolean', default: false },
			{ displayName: 'Private (Internal Note)', name: 'isPrivate', type: 'boolean', default: false },
			{ displayName: 'Upvotes', name: 'upvotes', type: 'number', typeOptions: { minValue: 0 }, default: 0 },
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['comment'], operation: ['getMany'] } },
		options: [
			{ ...resourceLocatorField('postId', 'Post', 'searchPosts', { required: false }), description: 'Filter to comments on this post' },
			{ displayName: 'Changelog ID', name: 'changelogId', type: 'string', default: '' },
			{
				displayName: 'Privacy',
				name: 'privacy',
				type: 'options',
				default: 'public',
				options: [
					{ name: 'Public', value: 'public' },
					{ name: 'Private', value: 'private' },
					{ name: 'All', value: 'all' },
				],
			},
			{ displayName: 'Include In-Review Comments', name: 'inReview', type: 'boolean', default: false },
		],
	},
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		default: 'best',
		displayOptions: { show: { resource: ['comment'], operation: ['getMany'] } },
		options: [
			{ name: 'Best', value: 'best' },
			{ name: 'Top', value: 'top' },
			{ name: 'New', value: 'new' },
			{ name: 'Old', value: 'old' },
		],
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['comment'], operation: ['getMany'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['comment'], operation: ['getMany'], returnAll: [false] } },
	},
];

function buildCommentBody(fields: IDataObject): IDataObject {
	const body: IDataObject = {};

	for (const key of ['changelogId', 'parentCommentId', 'isPrivate', 'sendNotification', 'createdAt', 'upvotes', 'downvotes', 'isPinned', 'inReview']) {
		if (fields[key] !== undefined && fields[key] !== '') body[key] = fields[key];
	}

	if (fields.postId) body.postId = extractId(fields.postId);

	const author = cleanAuthorInput(fields.author as IDataObject);
	if (author) body.author = author;

	return body;
}

export async function executeComment(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const useMarkdown = ['create', 'update'].includes(operation) ? (this.getNodeParameter('markdown', index, true) as boolean) : false;

	switch (operation) {
		case 'getMany': {
			const filters = this.getNodeParameter('filters', index, {}) as IDataObject;
			if (filters.postId) filters.postId = extractId(filters.postId);
			const sortBy = this.getNodeParameter('sortBy', index) as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);

			const comments = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/comments', { sortBy, ...filters }, returnAll, limit);
			return comments.map((comment) => withContentText(comment));
		}

		case 'get': {
			const commentId = extractId(this.getNodeParameter('commentId', index));
			const comment = (await featurebaseApiRequest.call(this, 'GET', `/v2/comments/${commentId}`)) as IDataObject;
			return withContentText(comment);
		}

		case 'create': {
			const content = this.getNodeParameter('content', index) as string;
			const additionalFields = this.getNodeParameter('additionalFields', index, {}) as IDataObject;

			const body: IDataObject = {
				content: useMarkdown ? markdownToHtml(content) : content,
				...buildCommentBody(additionalFields),
			};

			const comment = (await featurebaseApiRequest.call(this, 'POST', '/v2/comments', body)) as IDataObject;
			return withContentText(comment);
		}

		case 'update': {
			const commentId = extractId(this.getNodeParameter('commentId', index));
			const content = this.getNodeParameter('content', index) as string;
			const updateFields = this.getNodeParameter('updateFields', index, {}) as IDataObject;

			const body: IDataObject = {
				content: useMarkdown ? markdownToHtml(content) : content,
				...buildCommentBody(updateFields),
			};

			const comment = (await featurebaseApiRequest.call(this, 'PATCH', `/v2/comments/${commentId}`, body)) as IDataObject;
			return withContentText(comment);
		}

		case 'delete': {
			const commentId = extractId(this.getNodeParameter('commentId', index));
			return featurebaseApiRequest.call(this, 'DELETE', `/v2/comments/${commentId}`);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown comment operation "${operation}"`, { itemIndex: index });
	}
}
