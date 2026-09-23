import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { adminFields, adminOperations, executeAdmin } from './descriptions/AdminDescription';
import { boardFields, boardOperations, executeBoard } from './descriptions/BoardDescription';
import { brandFields, brandOperations, executeBrand } from './descriptions/BrandDescription';
import { changelogFields, changelogOperations, executeChangelog } from './descriptions/ChangelogDescription';
import { commentFields, commentOperations, executeComment } from './descriptions/CommentDescription';
import { companyFields, companyOperations, executeCompany } from './descriptions/CompanyDescription';
import { contactFields, contactOperations, executeContact } from './descriptions/ContactDescription';
import { conversationFields, conversationOperations, executeConversation } from './descriptions/ConversationDescription';
import { customFieldFields, customFieldOperations, executeCustomField } from './descriptions/CustomFieldDescription';
import { executeHelpCenter, helpCenterFields, helpCenterOperations } from './descriptions/HelpCenterDescription';
import { executePost, postFields, postOperations } from './descriptions/PostDescription';
import { executePostStatus, postStatusFields, postStatusOperations } from './descriptions/PostStatusDescription';
import { executeSurvey, surveyFields, surveyOperations } from './descriptions/SurveyDescription';
import { executeTeam, teamFields, teamOperations } from './descriptions/TeamDescription';
import { executeWebhook, webhookFields, webhookOperations } from './descriptions/WebhookDescription';
import { executeWorkflowHelper, workflowHelperFields, workflowHelperOperations } from './descriptions/WorkflowHelpersDescription';
import {
	getAdmins,
	getBoards,
	getBrands,
	getCustomFields,
	getHelpCenterCollections,
	getPostStatuses,
	getPostTags,
	getTeams,
	searchAdmins,
	searchBoards,
	searchBrands,
	searchComments,
	searchCustomFields,
	searchHelpCenterCollections,
	searchPostStatuses,
	searchPosts,
	searchTeams,
} from './GenericFunctions';

type ResourceExecutor = (this: IExecuteFunctions, index: number, operation: string) => Promise<IDataObject | IDataObject[]>;

const RESOURCE_EXECUTORS: Record<string, ResourceExecutor> = {
	post: executePost,
	comment: executeComment,
	changelog: executeChangelog,
	board: executeBoard,
	postStatus: executePostStatus,
	customField: executeCustomField,
	admin: executeAdmin,
	team: executeTeam,
	brand: executeBrand,
	contact: executeContact,
	company: executeCompany,
	conversation: executeConversation,
	survey: executeSurvey,
	helpCenterArticle: executeHelpCenter,
	webhook: executeWebhook,
	workflowHelper: executeWorkflowHelper,
};

export class Featurebase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Featurebase',
		name: 'featurebase',
		icon: { light: 'file:Featurebase.svg', dark: 'file:Featurebase.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage feedback boards, changelogs, help center, and support conversations on Featurebase',
		defaults: { name: 'Featurebase' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [{ name: 'featurebaseApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'post',
				options: [
					{ name: 'Admin', value: 'admin' },
					{ name: 'Board', value: 'board' },
					{ name: 'Brand', value: 'brand' },
					{ name: 'Changelog', value: 'changelog' },
					{ name: 'Comment', value: 'comment' },
					{ name: 'Company', value: 'company' },
					{ name: 'Contact', value: 'contact' },
					{ name: 'Conversation', value: 'conversation' },
					{ name: 'Custom Field', value: 'customField' },
					{ name: 'Help Center Article', value: 'helpCenterArticle' },
					{ name: 'Post', value: 'post' },
					{ name: 'Post Status', value: 'postStatus' },
					{ name: 'Survey', value: 'survey' },
					{ name: 'Team', value: 'team' },
					{ name: 'Webhook', value: 'webhook' },
					{ name: 'Workflow Helper', value: 'workflowHelper' },
				],
			},
			postOperations,
			...postFields,
			commentOperations,
			...commentFields,
			changelogOperations,
			...changelogFields,
			boardOperations,
			...boardFields,
			postStatusOperations,
			...postStatusFields,
			customFieldOperations,
			...customFieldFields,
			adminOperations,
			...adminFields,
			teamOperations,
			...teamFields,
			brandOperations,
			...brandFields,
			contactOperations,
			...contactFields,
			companyOperations,
			...companyFields,
			conversationOperations,
			...conversationFields,
			surveyOperations,
			...surveyFields,
			helpCenterOperations,
			...helpCenterFields,
			webhookOperations,
			...webhookFields,
			workflowHelperOperations,
			...workflowHelperFields,
		],
	};

	methods = {
		loadOptions: {
			getBoards,
			getPostStatuses,
			getAdmins,
			getTeams,
			getBrands,
			getCustomFields,
			getHelpCenterCollections,
			getPostTags,
		},
		listSearch: {
			searchBoards,
			searchPostStatuses,
			searchAdmins,
			searchTeams,
			searchBrands,
			searchCustomFields,
			searchHelpCenterCollections,
			searchPosts,
			searchComments,
		} as Record<string, (this: ILoadOptionsFunctions, filter?: string, paginationToken?: string) => Promise<INodeListSearchResult>>,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const executor = RESOURCE_EXECUTORS[resource];

		if (!executor) {
			throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const result = await executor.call(this, i, operation);
				const resultItems = Array.isArray(result) ? result : [result];

				for (const resultItem of resultItems) {
					returnData.push({ json: resultItem, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
