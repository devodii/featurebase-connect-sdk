import { buildSimpleResource } from './simple-resource';

export const {
	operations: teamOperations,
	fields: teamFields,
	execute: executeTeam,
} = buildSimpleResource({
	resource: 'team',
	resourceName: 'team',
	getOperation: 'getTeamById',
	listOperation: 'listTeams',
	searchListMethod: 'searchTeams',
	idFieldDescription: 'The team to look up',
	simplifyFields: ['id', 'name', 'color', 'members'],
});
