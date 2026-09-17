import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FeaturebaseApi implements ICredentialType {
	name = 'featurebaseApi';

	displayName = 'Featurebase API';

	documentationUrl = 'https://auth.featurebase.app/login?redirect=/settings/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'API key from Featurebase Settings > API. Sent as an Authorization: Bearer header.',
		},
		{
			displayName: 'API Version',
			name: 'apiVersion',
			type: 'string',
			default: '2026-01-01.nova',
			description:
				'Sent as the Featurebase-Version header on every request. Pin this so your workflows keep working across future Featurebase API releases.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://do.featurebase.app',
			description: 'Advanced: only change this for a self-hosted or region-specific Featurebase deployment.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'Featurebase-Version': '={{$credentials.apiVersion}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v2/boards',
			qs: { limit: 1 },
		},
	};
}
