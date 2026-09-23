import { buildSimpleResource } from './simpleResource';

export const {
	operations: customFieldOperations,
	fields: customFieldFields,
	execute: executeCustomField,
} = buildSimpleResource({
	resource: 'customField',
	resourceName: 'custom field',
	endpoint: '/v2/custom_fields',
	searchListMethod: 'searchCustomFields',
	idFieldDescription: 'The custom field to look up',
	simplifyFields: ['id', 'label', 'type', 'required', 'options'],
});
