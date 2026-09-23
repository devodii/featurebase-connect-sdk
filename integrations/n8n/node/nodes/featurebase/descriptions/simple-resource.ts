import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { Types } from '@featurebase-connect-sdk/core';

import { getFeaturebaseClient } from '../featurebase-client';
import { extractId, limitField, pick, resourceLocatorField, returnAllField, simplifyField } from './shared';

export interface SimpleResourceConfig {
	resource: string;
	resourceName: string;
	getOperation: Types.OperationId;
	listOperation: Types.OperationId;
	searchListMethod: string;
	idFieldDescription: string;
	simplifyFields: string[];
}

/** Normalizes list responses that are sometimes a plain array, sometimes `{ data }`. */
function extractItems(response: unknown): IDataObject[] {
	if (Array.isArray(response)) return response as IDataObject[];
	if (response && typeof response === 'object' && 'data' in response) return (response as { data: IDataObject[] }).data;
	return [];
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
	const { resource, resourceName, getOperation, listOperation, searchListMethod, idFieldDescription, simplifyFields } = config;
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
		const client = await getFeaturebaseClient(this);
		const simplify = this.getNodeParameter('simplify', index, true) as boolean;
		const finalize = (item: IDataObject): IDataObject => (simplify ? pick(item, simplifyFields) : item);

		if (operation === 'get') {
			const id = extractId(this.getNodeParameter(idField, index));
			const item = (await client.execute(getOperation, { params: { id } } as never)) as IDataObject;
			return finalize(item);
		}

		const returnAll = this.getNodeParameter('returnAll', index) as boolean;
		// This resource's list endpoint doesn't reliably support cursor pagination across
		// all six resources sharing this factory, so "return all" is capped at one generous page.
		const limit = returnAll ? 100 : (this.getNodeParameter('limit', index) as number);
		const response = await client.execute(listOperation, { query: { limit } } as never);
		return extractItems(response).map(finalize);
	}

	return { operations, fields, execute };
}
