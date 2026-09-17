import { buildSimpleResource } from './simpleResource';

export const { operations: boardOperations, fields: boardFields, execute: executeBoard } = buildSimpleResource({
	resource: 'board',
	resourceName: 'board',
	endpoint: '/v2/boards',
	searchListMethod: 'searchBoards',
	idFieldDescription: 'The board (category) to look up',
});
