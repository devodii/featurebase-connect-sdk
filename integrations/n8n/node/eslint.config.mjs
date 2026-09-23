import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

// This package now depends on @featurebase-connect-sdk/core, so it can no longer
// be verified for n8n Cloud (which requires zero dependencies) - see README.
export default [
	...configWithoutCloudSupport,
	{
		rules: {
			// Source stays kebab-case; scripts/build.mjs renames to n8n's required PascalCase at build time.
			'n8n-nodes-base/node-filename-against-convention': 'off',
			'n8n-nodes-base/cred-filename-against-convention': 'off',
		},
	},
];
