import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { extractId, limitField, pick, resourceLocatorField, returnAllField, simplifyField } from './shared';

export interface SimpleResourceConfig {
	resource: string;
	resourceName: string;
	endpoint: string;
	searchListMethod: string;
	idFieldDescription: string;
	simplifyFields: string[];
}

/**
 * Boards, Post Statuses, Admins, Teams, Brands, and Custom Fields are all
 * read-only "Get / Get Many" resources with an identical shape in the
 * Featurebase API, so they share one implementation instead of six
 * near-duplicates.
 */
export function buildSimpleResource(config: SimpleResourceConfig): {
	operations: INodeProperties;
	fields: INodeProperties[];
	execute: (this: IExecuteFunctions, index: number, operation: string) => Promise<IDataObject | IDataObject[]>;
} {
	const { resource, resourceName, endpoint, searchListMethod, idFieldDescription, simplifyFields } = config;
	const idField = `${resource}Id`;

	const operations: INodeProperties = {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [resource] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				description: `Get a single ${resourceName} by ID`,
				action: `Get a ${resourceName}`,
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: `Get many ${resourceName}s`,
				action: `Get many ${resourceName}s`,
			},
		],
		default: 'getMany',
	};

	const fields: INodeProperties[] = [
		{
			...resourceLocatorField(idField, `${resourceName} ID`, searchListMethod, {
				description: idFieldDescription,
			}),
			displayOptions: { show: { resource: [resource], operation: ['get'] } },
		},
		{
			...returnAllField,
			displayOptions: { show: { resource: [resource], operation: ['getMany'] } },
		},
		{
			...limitField,
			displayOptions: { show: { resource: [resource], operation: ['getMany'], returnAll: [false] } },
		},
		{
			...simplifyField,
			displayOptions: { show: { resource: [resource], operation: ['get', 'getMany'] } },
		},
	];

	async function execute(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
		const simplify = this.getNodeParameter('simplify', index, true) as boolean;
		const finalize = (item: IDataObject): IDataObject => (simplify ? pick(item, simplifyFields) : item);

		if (operation === 'get') {
			const id = extractId(this.getNodeParameter(idField, index));
			const item = (await featurebaseApiRequest.call(this, 'GET', `${endpoint}/${id}`)) as IDataObject;
			return finalize(item);
		}

		const returnAll = this.getNodeParameter('returnAll', index) as boolean;
		const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
		const items = await (featurebaseApiRequestAllItems<IDataObject>).call(this, endpoint, {}, returnAll, limit);
		return items.map(finalize);
	}

	return { operations, fields, execute };
}
