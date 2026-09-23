import * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';
import { notionProperty, type NotionClient, type NotionProperties } from './notion-client';

type Post = _$featurebaseconnect0.Types.components['schemas']['Post'];

/** Maps this integration's logical fields to the actual property names in your Notion database. */
export interface NotionPropertyNames {
	title: string;
	status: string;
	board: string;
	upvotes: string;
	url: string;
	featurebasePostId: string;
}

type FeaturebaseClient = ReturnType<typeof _$featurebaseconnect0.createFeaturebase>;

export interface SyncOptions {
	featurebase: FeaturebaseClient;
	notion: NotionClient;
	databaseId: string;
	propertyNames: NotionPropertyNames;
}

export interface SyncResult {
	created: number;
	updated: number;
}

async function fetchAllPosts(featurebase: FeaturebaseClient): Promise<Post[]> {
	return _$featurebaseconnect0.collectAll<Post>(async (cursor) => {
		const page = await featurebase.execute('listPosts', { query: { cursor } });
		return { items: page.data, nextCursor: page.nextCursor };
	});
}

async function fetchBoardNames(featurebase: FeaturebaseClient): Promise<Map<string, string>> {
	// listBoards returns a plain array, not a paginated { data, nextCursor } shape.
	const boards = await featurebase.execute('listBoards');
	return new Map(boards.map((board) => [board.id, board.name]));
}

function propertiesForPost(post: Post, boardName: string, propertyNames: NotionPropertyNames): NotionProperties {
	return {
		[propertyNames.title]: notionProperty.title(post.title),
		[propertyNames.status]: notionProperty.select(post.status.name),
		[propertyNames.board]: notionProperty.select(boardName),
		[propertyNames.upvotes]: notionProperty.number(post.upvotes),
		[propertyNames.url]: notionProperty.url(post.postUrl),
		[propertyNames.featurebasePostId]: notionProperty.richText(post.id),
	};
}

/**
 * Mirrors every Featurebase post into a Notion database: creates a page for a post that
 * doesn't have one yet (matched by the Featurebase post id stored in a rich_text property),
 * and updates the existing page otherwise, so re-running this is always safe.
 */
export async function syncPostsToNotion(options: SyncOptions): Promise<SyncResult> {
	const { featurebase, notion, databaseId, propertyNames } = options;

	const [posts, boardNames] = await Promise.all([fetchAllPosts(featurebase), fetchBoardNames(featurebase)]);

	let created = 0;
	let updated = 0;

	for (const post of posts) {
		const boardName = boardNames.get(post.boardId) ?? post.boardId;
		const properties = propertiesForPost(post, boardName, propertyNames);

		const existing = await notion.queryDatabase(databaseId, {
			property: propertyNames.featurebasePostId,
			rich_text: { equals: post.id },
		});

		if (existing.length > 0) {
			await notion.updatePage(existing[0].id, properties);
			updated += 1;
		} else {
			await notion.createPage(databaseId, properties);
			created += 1;
		}
	}

	return { created, updated };
}
