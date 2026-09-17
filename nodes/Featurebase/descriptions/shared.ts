import type { INodeProperties } from 'n8n-workflow';

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
