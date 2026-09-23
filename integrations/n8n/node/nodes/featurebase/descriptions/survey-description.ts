import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getFeaturebaseClient } from '../featurebase-client';
import { extractItems, limitField, pick, returnAllField, simplifyField } from './shared';

const SURVEY_SIMPLIFY_FIELDS = ['id', 'title', 'description', 'isActive', 'responseCount', 'createdAt', 'updatedAt'];

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
	{
		...simplifyField,
		displayOptions: { show: { resource: ['survey'], operation: ['get', 'getMany'] } },
	},
];

export async function executeSurvey(this: IExecuteFunctions, index: number, operation: string): Promise<IDataObject | IDataObject[]> {
	const client = await getFeaturebaseClient(this);
	const simplify = ['get', 'getMany'].includes(operation) ? (this.getNodeParameter('simplify', index, true) as boolean) : false;
	const finalize = (survey: IDataObject): IDataObject => (simplify ? pick(survey, SURVEY_SIMPLIFY_FIELDS) : survey);

	switch (operation) {
		case 'getMany': {
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? 100 : (this.getNodeParameter('limit', index) as number);
			const surveys = extractItems(await client.execute('listSurveys', { query: { limit } }));
			return surveys.map(finalize);
		}

		case 'get': {
			const surveyId = this.getNodeParameter('surveyId', index) as string;
			const survey = (await client.execute('getSurvey', { params: { id: surveyId } })) as IDataObject;
			return finalize(survey);
		}

		case 'getResponses': {
			const surveyId = this.getNodeParameter('surveyId', index) as string;
			const pageId = this.getNodeParameter('pageId', index, '') as string;
			const returnAll = this.getNodeParameter('returnAll', index) as boolean;
			const limit = returnAll ? 100 : (this.getNodeParameter('limit', index) as number);
			const qs: IDataObject = { limit };
			if (pageId) qs.pageId = pageId;
			return extractItems(await client.execute('getSurveyResponses', { params: { id: surveyId }, query: qs as never }));
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown survey operation "${operation}"`, { itemIndex: index });
	}
}
