import { buildSimpleResource } from './simpleResource';

export const {
	operations: postStatusOperations,
	fields: postStatusFields,
	execute: executePostStatus,
} = buildSimpleResource({
	resource: 'postStatus',
	resourceName: 'post status',
	endpoint: '/v2/post_statuses',
	searchListMethod: 'searchPostStatuses',
	idFieldDescription: 'The post status to look up',
});
