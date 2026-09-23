import { buildSimpleResource } from './simpleResource';

export const {
	operations: teamOperations,
	fields: teamFields,
	execute: executeTeam,
} = buildSimpleResource({
	resource: 'team',
	resourceName: 'team',
	endpoint: '/v2/teams',
	searchListMethod: 'searchTeams',
	idFieldDescription: 'The team to look up',
	simplifyFields: ['id', 'name', 'color', 'members'],
});
