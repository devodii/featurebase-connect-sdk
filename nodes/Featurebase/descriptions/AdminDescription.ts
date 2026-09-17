import { buildSimpleResource } from './simpleResource';

export const {
	operations: adminOperations,
	fields: adminFields,
	execute: executeAdmin,
} = buildSimpleResource({
	resource: 'admin',
	resourceName: 'admin',
	endpoint: '/v2/admins',
	searchListMethod: 'searchAdmins',
	idFieldDescription: 'The admin to look up',
});
