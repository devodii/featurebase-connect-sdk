import type { FeaturebasePlugin } from '../client';
import { ContentTransformer } from '../transformers';

/**
 * Recursively walks a JSON object and applies a visitor function.
 */
function walk(obj: unknown, visitor: (node: Record<string, unknown>) => void) {
	if (obj === null || typeof obj !== 'object') return;
	visitor(obj as Record<string, unknown>);
	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			walk((obj as Record<string, unknown>)[key], visitor);
		}
	}
}

/**
 * A Core Plugin that automatically enhances API responses.
 * If any object returned by the API has a `content` or `body` field containing HTML,
 * this plugin automatically generates and attaches a clean `contentText` field.
 */
export function createFormattingPlugin(): FeaturebasePlugin {
	return {
		id: 'featurebase-auto-formatter',
		hooks: {
			afterResponse(data) {
				walk(data, (node) => {
					// Post and Comment resources use `content`
					if (typeof node.content === 'string') {
						node.contentText = ContentTransformer.htmlToText(node.content);
					}
					// Help Center articles use `body`
					if (typeof node.body === 'string') {
						node.contentText = ContentTransformer.htmlToText(node.body);
					}
				});
				return data;
			},
		},
	};
}
