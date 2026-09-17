import { buildSimpleResource } from './simpleResource';

export const {
	operations: brandOperations,
	fields: brandFields,
	execute: executeBrand,
} = buildSimpleResource({
	resource: 'brand',
	resourceName: 'brand',
	endpoint: '/v2/brands',
	searchListMethod: 'searchBrands',
	idFieldDescription: 'The brand to look up',
	simplifyFields: ['id', 'name', 'isDefault', 'helpCenterId'],
});
