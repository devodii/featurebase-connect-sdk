import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { featurebaseApiRequest, featurebaseApiRequestAllItems } from '../GenericFunctions';
import { limitField, returnAllField } from './shared';

export const surveyOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['survey'] } },
	default: 'getMany',
	options: [
		{ name: 'Get Many', value: 'getMany', description: 'List surveys', action: 'Get many surveys' },
		{ name: 'Get', value: 'get', description: 'Get a survey by ID', action: 'Get a survey' },
		{ name: 'Get Responses', value: 'getResponses', description: 'List responses to a survey', action: 'Get survey responses' },
	],
};

export const surveyFields: INodeProperties[] = [
	{
		displayName: 'Survey ID',
		name: 'surveyId',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['survey'], operation: ['get', 'getResponses'] } },
	},
	{
		displayName: 'Page ID',
		name: 'pageId',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['survey'], operation: ['getResponses'] } },
		description: 'Filter responses to a specific survey page',
	},
	{
		...returnAllField,
		displayOptions: { show: { resource: ['survey'], operation: ['getMany', 'getResponses'] } },
	},
	{
		...limitField,
		displayOptions: { show: { resource: ['survey'], operation: ['getMany', 'getResponses'], returnAll: [false] } },
	},
];

export async function executeSurvey(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, '/v2/surveys', {}, returnAll, limit);
		}

		case 'get': {
			const surveyId = this.getNodeParameter('surveyId', index) as string;
			return featurebaseApiRequest.call(this, 'GET', `/v2/surveys/${surveyId}`);
		}

		case 'getResponses': {
			const surveyId = this.getNodeParameter('surveyId', index) as string;
			const pageId = this.getNodeParameter('pageId', index, '') as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', index) as number);
			const qs: IDataObject = {};
			if (pageId) qs.pageId = pageId;
			return (featurebaseApiRequestAllItems<IDataObject>).call(this, `/v2/surveys/${surveyId}/responses`, qs, returnAll, limit);
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown survey operation "${operation}"`, { itemIndex: index });
	}
}
