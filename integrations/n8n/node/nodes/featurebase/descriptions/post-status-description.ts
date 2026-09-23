import { buildSimpleResource } from './simple-resource';

export const {
	operations: postStatusOperations,
	fields: postStatusFields,
	execute: executePostStatus,
} = buildSimpleResource({
	resource: 'postStatus',
	resourceName: 'post status',
	getOperation: 'getPostStatus',
	listOperation: 'listPostStatuses',
	searchListMethod: 'searchPostStatuses',
	idFieldDescription: 'The post status to look up',
	simplifyFields: ['id', 'name', 'color', 'type', 'isDefault'],
});
