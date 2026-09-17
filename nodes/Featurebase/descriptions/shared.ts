import type { IDataObject, INodeProperties } from 'n8n-workflow';

import { htmlToText } from '../utils/html';

/**
 * Builds a resourceLocator field with a dropdown (backed by a loadOptions
 * method) and a manual "By ID" fallback, per the id-shaped-parameter
 * convention used across this node.
 */
export function resourceLocatorField(
	name: string,
	displayName: string,
	searchListMethod: string,
	options: { description?: string; required?: boolean } = {},
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: options.required ?? true,
		description: options.description,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod,
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: '507f1f77bcf86cd799439011',
			},
		],
	};
}

export const returnAllField: INodeProperties = {
	displayName: 'Return All',
	name: 'returnAll',
	type: 'boolean',
	default: false,
	description: 'Whether to return all results or only up to a given limit',
};

export const limitField: INodeProperties = {
	displayName: 'Limit',
	name: 'limit',
	type: 'number',
	default: 50,
	typeOptions: { minValue: 1, maxValue: 100 },
	displayOptions: { show: { returnAll: [false] } },
	description: 'Max number of results to return',
};

export const simplifyField: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description: 'Whether to return a simplified version of the response instead of the raw data',
};

export function extractId(value: unknown): string {
	if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
		return String((value as { value: unknown }).value);
	}
	return String(value);
}

export const markdownToggleField: INodeProperties = {
	displayName: 'Markdown',
	name: 'markdown',
	type: 'boolean',
	default: true,
	description: 'Whether the content field is written in markdown and should be converted to HTML before sending to Featurebase',
};

/**
 * Author/voter identification shared shape: id (Featurebase user) takes
 * priority over userId (external SSO id), which takes priority over email
 * (reference/FINDINGS.md section 9).
 */
export function authorCollectionField(name: string, displayName: string): INodeProperties {
	return {
		displayName,
		name,
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Used to find or create the user if no ID matches',
			},
			{
				displayName: 'External User ID',
				name: 'userId',
				type: 'string',
				default: '',
				description: 'External user ID from your system, matched via SSO. Takes priority over Email.',
			},
			{
				displayName: 'Featurebase User ID',
				name: 'id',
				type: 'string',
				default: '',
				description: 'Existing Featurebase user ID to attribute to. Takes priority over User ID and Email.',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'Display name to use if a new user is created',
			},
			{
				displayName: 'Profile Picture URL',
				name: 'profilePicture',
				type: 'string',
				default: '',
			},
		],
	};
}

export function cleanAuthorInput(value: IDataObject | undefined): IDataObject | undefined {
	if (!value || Object.keys(value).length === 0) return undefined;
	const cleaned: IDataObject = {};
	for (const [key, fieldValue] of Object.entries(value)) {
		if (fieldValue !== '' && fieldValue !== undefined && fieldValue !== null) {
			cleaned[key] = fieldValue;
		}
	}
	return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

/**
 * Adds a plain-text version of the HTML content field, so downstream AI
 * nodes don't have to strip markup themselves.
 */
export function withContentText<T extends IDataObject>(item: T, field = 'content'): T {
	if (typeof item[field] === 'string') {
		return { ...item, contentText: htmlToText(item[field] as string) };
	}
	return item;
}
