import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { markdownToHtml } from '../utils/markdown';
import { titleSimilarity } from '../utils/similarity';
import { authorCollectionField, cleanAuthorInput, extractId, resourceLocatorField, withContentText } from './shared';

export const workflowHelperOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['workflowHelper'] } },
	default: 'upsertFeedback',
	options: [
		{
			name: 'Upsert Feedback',
			value: 'upsertFeedback',
			description: 'Find a similar existing post by title, or create a new one if none matches',
			action: 'Upsert feedback',
		},
		{
			name: 'Revenue-Weighted Score',
			value: 'revenueWeightedScore',
			description: 'Score posts by upvotes weighted by linked HubSpot deal pipeline',
			action: 'Calculate revenue weighted score',
		},
		{
			name: 'Bulk Import',
			value: 'bulkImport',
			description: 'Create many posts from an array, without aborting on a single row failure',
			action: 'Bulk import posts',
		},
		{
			name: 'Set Status with Changelog Draft',
			value: 'setStatusWithChangelogDraft',
			description: 'Update a post status and pre-fill a draft changelog from it',
			action: 'Set status with changelog draft',
		},
	],
};

export const workflowHelperFields: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['upsertFeedback'] } },
	},
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['upsertFeedback'] } },
		description: 'On a match, posted as a new comment. On no match, used as the new post content.',
	},
	{
		...resourceLocatorField('boardId', 'Board', 'searchBoards', { description: 'Board to create the post in if no match is found' }),
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['upsertFeedback'] } },
	},
	{
		...authorCollectionField('author', 'Author'),
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['upsertFeedback'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['upsertFeedback'] } },
		options: [
			{
				displayName: 'Similarity Threshold',
				name: 'threshold',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 0.7,
				description: 'Minimum title similarity (0-1) to treat an existing post as a match',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated tag names to attach if a new post is created',
			},
			{
				displayName: 'Comment on Match Is Private',
				name: 'commentIsPrivate',
				type: 'boolean',
				default: false,
			},
		],
	},

	{
		displayName: 'Source',
		name: 'source',
		type: 'options',
		default: 'query',
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['revenueWeightedScore'] } },
		options: [
			{ name: 'Single Post', value: 'single' },
			{ name: 'Query (Many Posts)', value: 'query' },
		],
	},
	{
		...resourceLocatorField('postId', 'Post', 'searchPosts', { description: 'The post to score' }),
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['revenueWeightedScore'], source: ['single'] } },
	},
	{
		displayName: 'Query Options',
		name: 'queryOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['revenueWeightedScore'], source: ['query'] } },
		options: [
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'trending',
				options: [
					{ name: 'Created At', value: 'createdAt' },
					{ name: 'Upvotes', value: 'upvotes' },
					{ name: 'Trending', value: 'trending' },
					{ name: 'Recent Activity', value: 'recent' },
				],
			},
			{ displayName: 'Query', name: 'q', type: 'string', default: '' },
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				description: 'Max number of results to return',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
			},
		],
	},
	{
		displayName: 'Divisor',
		name: 'divisor',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1000,
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['revenueWeightedScore'] } },
		description: 'ArrWeight = upvotes + openPipeline / divisor',
	},

	{
		displayName: 'Items',
		name: 'items',
		type: 'json',
		default: '[]',
		required: true,
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['bulkImport'] } },
		description: 'Array of { title, content, board, authorEmail, authorName, createdAt, upvotes, status, tags }. "board" and "status" match by name or ID.',
		hint: 'Use an upstream Aggregate node to combine one item per row into a single array before this field, e.g. {{ $json.items }}',
	},

	{
		...resourceLocatorField('postId', 'Post', 'searchPosts', {}),
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['setStatusWithChangelogDraft'] } },
	},
	{
		...resourceLocatorField('statusId', 'Status', 'searchPostStatuses', {}),
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['setStatusWithChangelogDraft'] } },
	},
	{
		displayName: 'Options',
		name: 'changelogOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['workflowHelper'], operation: ['setStatusWithChangelogDraft'] } },
		options: [
			{ displayName: 'ETA', name: 'eta', type: 'dateTime', default: '' },
			{
				displayName: 'Changelog Title',
				name: 'changelogTitle',
				type: 'string',
				default: '',
				description: 'Defaults to the post title',
			},
			{
				displayName: 'Changelog Content (Markdown)',
				name: 'changelogContent',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description: 'Defaults to the post content',
			},
		],
	},
];

function sumHubspotDeals(post: IDataObject): { openPipeline: number; closedRevenue: number } {
	const hubspotDeals = ((post.integrations as IDataObject)?.hubspot as IDataObject[]) ?? [];
	let openPipeline = 0;
	let closedRevenue = 0;

	for (const deal of hubspotDeals) {
		const amount = typeof deal.dealAmount === 'number' ? deal.dealAmount : 0;
		if (deal.dealClosed === true) {
			closedRevenue += amount;
		} else {
			openPipeline += amount;
		}
	}

	return { openPipeline, closedRevenue };
}

function scorePost(post: IDataObject, divisor: number): IDataObject {
	const { openPipeline, closedRevenue } = sumHubspotDeals(post);
	const upvotes = typeof post.upvotes === 'number' ? post.upvotes : 0;
	return {
		...post,
		openPipeline,
		closedRevenue,
		arrWeight: upvotes + openPipeline / divisor,
	};
}

export async function executeWorkflowHelper(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'upsertFeedback': {
			const title = this.getNodeParameter('title', index) as string;
			const content = this.getNodeParameter('content', index, '') as string;
			const boardId = extractId(this.getNodeParameter('boardId', index));
			const author = cleanAuthorInput(this.getNodeParameter('author', index, {}) as IDataObject);
			const options = this.getNodeParameter('options', index, {}) as IDataObject;
			const threshold = typeof options.threshold === 'number' ? options.threshold : 0.7;

			const candidates = await (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/posts', { q: title, sortBy: 'recent', limit: 25 }, false, 25);

			let bestMatch: IDataObject | undefined;
			let bestScore = 0;
			for (const candidate of candidates) {
				const score = titleSimilarity(title, String(candidate.title ?? ''));
				if (score > bestScore) {
					bestScore = score;
					bestMatch = candidate;
				}
			}

			if (bestMatch && bestScore >= threshold) {
				if (author) {
					try {
						await featurebaseApiRequest.call(this, 'POST', `/v2/posts/${bestMatch.id as string}/voters`, author);
					} catch {
						// Voter may already exist; the match/comment result is what matters here.
					}
				}

				if (content) {
					await featurebaseApiRequest.call(this, 'POST', '/v2/comments', {
						postId: bestMatch.id,
						content: markdownToHtml(content),
						isPrivate: Boolean(options.commentIsPrivate),
						author,
					});
				}

				const refreshed = (await featurebaseApiRequest.call(this, 'GET', `/v2/posts/${bestMatch.id as string}`)) as IDataObject;
				return { ...withContentText(refreshed), matched: true, similarityScore: bestScore };
			}

			const tags = typeof options.tags === 'string' && options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined;
			const created = (await featurebaseApiRequest.call(this, 'POST', '/v2/posts', {
				title,
				boardId,
				content: markdownToHtml(content),
				...(author ? { author } : {}),
				...(tags ? { tags } : {}),
			})) as IDataObject;

			return { ...withContentText(created), matched: false, similarityScore: bestScore };
		}

		case 'revenueWeightedScore': {
			const source = this.getNodeParameter('source', index) as string;
			const divisor = this.getNodeParameter('divisor', index) as number;

			if (source === 'single') {
				const postId = extractId(this.getNodeParameter('postId', index));
				const post = (await featurebaseApiRequest.call(this, 'GET', `/v2/posts/${postId}`)) as IDataObject;
				return scorePost(post, divisor);
			}

			const queryOptions = this.getNodeParameter('queryOptions', index, {}) as IDataObject;
			const limit = typeof queryOptions.limit === 'number' ? queryOptions.limit : 10;
			const posts = await (featurebaseApiRequestAllItems<IDataObject>).call(
				this,
				'/v2/posts',
				{ sortBy: queryOptions.sortBy ?? 'trending', q: queryOptions.q || undefined },
				false,
				limit,
			);

			return posts.map((post) => scorePost(post, divisor)).sort((a, b) => (b.arrWeight as number) - (a.arrWeight as number));
		}

		case 'bulkImport': {
			const raw = this.getNodeParameter('items', index) as string | IDataObject[];
			const rows: IDataObject[] = typeof raw === 'string' ? JSON.parse(raw) : raw;

			const [boards, statuses] = await Promise.all([
				(featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/boards'),
				(featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/post_statuses'),
			]);

			const resolveId = (list: IDataObject[], nameOrId: string | undefined): string | undefined => {
				if (!nameOrId) return undefined;
				const byName = list.find((entry) => (entry.name as string)?.toLowerCase() === nameOrId.toLowerCase());
				return byName ? (byName.id as string) : nameOrId;
			};

			const results: IDataObject[] = [];

			for (const row of rows) {
				try {
					const body: IDataObject = {
						title: row.title,
						boardId: resolveId(boards, row.board as string),
						content: markdownToHtml(String(row.content ?? '')),
					};

					if (row.authorEmail || row.authorName) {
						body.author = { email: row.authorEmail, name: row.authorName };
					}
					if (row.createdAt) body.createdAt = row.createdAt;
					if (row.upvotes !== undefined) body.upvotes = row.upvotes;
					if (row.status) body.statusId = resolveId(statuses, row.status as string);
					if (row.tags) {
						body.tags = Array.isArray(row.tags)
							? row.tags
							: String(row.tags)
									.split(',')
									.map((t) => t.trim());
					}

					const post = await featurebaseApiRequest.call(this, 'POST', '/v2/posts', body);
					results.push({ success: true, row, post });
				} catch (error) {
					results.push({ success: false, row, error: error instanceof Error ? error.message : String(error) });
				}
			}

			return results;
		}

		case 'setStatusWithChangelogDraft': {
			const postId = extractId(this.getNodeParameter('postId', index));
			const statusId = extractId(this.getNodeParameter('statusId', index));
			const options = this.getNodeParameter('changelogOptions', index, {}) as IDataObject;

			const updateBody: IDataObject = { statusId };
			if (options.eta) updateBody.eta = options.eta;
			const post = (await featurebaseApiRequest.call(this, 'PATCH', `/v2/posts/${postId}`, updateBody)) as IDataObject;

			const changelogBody: IDataObject = { title: options.changelogTitle || post.title };
			if (options.changelogContent) {
				changelogBody.markdownContent = options.changelogContent;
			} else {
				changelogBody.htmlContent = post.content;
			}

			const changelog = await featurebaseApiRequest.call(this, 'POST', '/v2/changelogs', changelogBody);

			return { post: withContentText(post), changelog };
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown workflow helper operation "${operation}"`, { itemIndex: index });
	}
}
