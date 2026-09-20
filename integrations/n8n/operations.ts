import type * as _$featurebaseconnect0 from '@featurebase-connect-sdk/core';

// Method and path for each Post operation this integration uses, straight from reference/openapi.json.
export const n8nOperations: Record<string, _$featurebaseconnect0.OperationDescriptor> = {
	listPosts: { method: 'GET', path: '/v2/posts' },
	getPost: { method: 'GET', path: '/v2/posts/{id}' },
	createPost: { method: 'POST', path: '/v2/posts' },
	updatePost: { method: 'PATCH', path: '/v2/posts/{id}' },
	deletePost: { method: 'DELETE', path: '/v2/posts/{id}' },
};
