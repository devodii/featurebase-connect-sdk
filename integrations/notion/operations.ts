import type { OperationDescriptor } from '@featurebase-connect-sdk/core';

// A Notion sync mostly reads posts (to mirror into a Notion database) and boards
// (to map a board id to a human name), with createPost for the reverse direction:
// turning a new Notion database row into a Featurebase post.
export const notionOperations: Record<string, OperationDescriptor> = {
	listPosts: { method: 'GET', path: '/v2/posts' },
	getPost: { method: 'GET', path: '/v2/posts/{id}' },
	listBoards: { method: 'GET', path: '/v2/boards' },
	createPost: { method: 'POST', path: '/v2/posts' },
};
