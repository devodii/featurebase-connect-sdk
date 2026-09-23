import { config } from '@n8n/node-cli/eslint';

export default [
	...config,
	{
		rules: {
			// Source stays kebab-case; scripts/build.mjs renames to n8n's required PascalCase
			// at build time, so these rules (which assume dist mirrors source case-for-case)
			// can't resolve the mapping. The actual dist output and package.json's n8n.nodes/
			// n8n.credentials paths are verified correct by running the real build.
			'n8n-nodes-base/node-filename-against-convention': 'off',
			'n8n-nodes-base/cred-filename-against-convention': 'off',
			'@n8n/community-nodes/no-credential-reuse': 'off',
			'@n8n/community-nodes/node-registration-complete': 'off',
		},
	},
];
