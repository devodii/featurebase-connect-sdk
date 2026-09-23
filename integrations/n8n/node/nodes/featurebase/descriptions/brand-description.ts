import { buildSimpleResource } from './simple-resource';

export const {
	operations: brandOperations,
	fields: brandFields,
	execute: executeBrand,
} = buildSimpleResource({
	resource: 'brand',
	resourceName: 'brand',
	getOperation: 'getBrandById',
	listOperation: 'listBrands',
	searchListMethod: 'searchBrands',
	idFieldDescription: 'The brand to look up',
	simplifyFields: ['id', 'name', 'isDefault', 'helpCenterId'],
});
