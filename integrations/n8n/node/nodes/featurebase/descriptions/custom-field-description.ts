import { buildSimpleResource } from './simple-resource';

export const {
	operations: customFieldOperations,
	fields: customFieldFields,
	execute: executeCustomField,
} = buildSimpleResource({
	resource: 'customField',
	resourceName: 'custom field',
	getOperation: 'getCustomField',
	listOperation: 'listCustomFields',
	searchListMethod: 'searchCustomFields',
	idFieldDescription: 'The custom field to look up',
	simplifyFields: ['id', 'label', 'type', 'required', 'options'],
});
