import { buildSimpleResource } from './simple-resource';

export const {
	operations: adminOperations,
	fields: adminFields,
	execute: executeAdmin,
} = buildSimpleResource({
	resource: 'admin',
	resourceName: 'admin',
	getOperation: 'getAdmin',
	listOperation: 'listAdmins',
	searchListMethod: 'searchAdmins',
	idFieldDescription: 'The admin to look up',
	simplifyFields: ['id', 'name', 'email', 'roleId'],
});
