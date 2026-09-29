import { buildSimpleResource } from './simple-resource';

export const {
	operations: boardOperations,
	fields: boardFields,
	execute: executeBoard,
} = buildSimpleResource({
	resource: 'board',
	resourceName: 'board',
	getOperation: 'getBoard',
	listOperation: 'listBoards',
	supportsServerLimit: false,
	searchListMethod: 'searchBoards',
	idFieldDescription: 'The board (category) to look up',
	simplifyFields: ['id', 'name'],
});
