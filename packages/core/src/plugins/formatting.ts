import type { FeaturebasePlugin } from '../client';
import { htmlToText } from '../transformers';

function walk(obj: unknown, visitor: (node: Record<string, unknown>) => void) {
	if (obj === null || typeof obj !== 'object') return;
	visitor(obj as Record<string, unknown>);
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			walk((obj as Record<string, unknown>)[key], visitor);
		}
	}
}

export function applyFormatting(): FeaturebasePlugin {
	return {
		id: 'featurebase-auto-formatter',
		hooks: {
			afterResponse(data) {
				walk(data, (node) => {
					// Post and Comment resources use `content`
					if (typeof node.content === 'string') {
						node.contentText = htmlToText(node.content);
					}
					// Help Center articles use `body`
					if (typeof node.body === 'string') {
						node.contentText = htmlToText(node.body);
					}
				});
				return data;
			},
		},
	};
}
