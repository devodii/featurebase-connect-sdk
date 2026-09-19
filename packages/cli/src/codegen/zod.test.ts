// This is a build-time cli tool, not n8n node code, so node builtins are fine.
/* eslint-disable @n8n/community-nodes/no-restricted-imports, @n8n/community-nodes/no-restricted-globals */
import { resolve } from 'path';
import { z } from 'zod';
import { getSchema, loadOpenApi, type OpenApiDocument } from '../openapi/loader';
import type { JsonSchema } from '../openapi/schema';
import { generateZodSchema } from './zod';

const SPEC_PATH = resolve(__dirname, '../../../../reference/openapi.json');

/** Evaluates a generated expression string into a real zod schema, the way the compiler's emitted file would run it. */
function evaluate(expr: string): z.ZodTypeAny {
	// eslint-disable-next-line @n8n/community-nodes/no-dangerous-functions
	return new Function('z', `return ${expr};`)(z) as z.ZodTypeAny;
}

describe('generateZodSchema against the real Featurebase spec', () => {
	const document = loadOpenApi(SPEC_PATH);

	describe('CreatePostBody', () => {
		const schema = evaluate(generateZodSchema(document, getSchema(document, 'CreatePostBody'), 'CreatePostBody'));

		it('accepts a payload with only the required fields', () => {
			expect(schema.safeParse({ title: 'Add dark mode', boardId: '507f1f77bcf86cd799439011' }).success).toBe(true);
		});

		it('rejects a payload missing a required field', () => {
			expect(schema.safeParse({ title: 'Add dark mode' }).success).toBe(false);
		});

		it('rejects an unknown property, since additionalProperties is false', () => {
			const result = schema.safeParse({ title: 'Add dark mode', boardId: 'b1', notARealField: true });
			expect(result.success).toBe(false);
		});

		it('accepts an explicit null for a nullable boolean field', () => {
			const result = schema.safeParse({ title: 'Add dark mode', boardId: 'b1', commentsEnabled: null });
			expect(result.success).toBe(true);
		});

		it('accepts tags as a single string or as an array, per its anyOf', () => {
			expect(schema.safeParse({ title: 'ok title', boardId: 'b1', tags: 'feature' }).success).toBe(true);
			expect(schema.safeParse({ title: 'ok title', boardId: 'b1', tags: ['feature', 'ui'] }).success).toBe(true);
		});

		it('enforces the visibility enum', () => {
			expect(schema.safeParse({ title: 'ok title', boardId: 'b1', visibility: 'public' }).success).toBe(true);
			expect(schema.safeParse({ title: 'ok title', boardId: 'b1', visibility: 'not-a-real-value' }).success).toBe(false);
		});

		it('validates a nested $ref (author) using the referenced schema, including its email format', () => {
			const valid = schema.safeParse({ title: 'ok title', boardId: 'b1', author: { email: 'john@example.com' } });
			expect(valid.success).toBe(true);

			const invalid = schema.safeParse({ title: 'ok title', boardId: 'b1', author: { email: 'not-an-email' } });
			expect(invalid.success).toBe(false);
		});

		it('treats a schema-only additionalProperties field as a record', () => {
			const result = schema.safeParse({ title: 'ok title', boardId: 'b1', customFields: { '507f1f77bcf86cd799439011': 'high' } });
			expect(result.success).toBe(true);
		});
	});

	describe('AuthorInput', () => {
		const schema = evaluate(generateZodSchema(document, getSchema(document, 'AuthorInput'), 'AuthorInput'));

		it('has every field optional', () => {
			expect(schema.safeParse({}).success).toBe(true);
		});

		it('rejects an invalid email', () => {
			expect(schema.safeParse({ email: 'nope' }).success).toBe(false);
		});
	});
});

describe('generateZodSchema cycle handling', () => {
	it('breaks a mutual reference with z.lazy instead of recursing forever', () => {
		const schemas: Record<string, JsonSchema> = {
			A: {
				type: 'object',
				properties: { b: { $ref: '#/components/schemas/B' } },
			},
			B: {
				type: 'object',
				properties: { a: { $ref: '#/components/schemas/A' } },
			},
		};
		const document: OpenApiDocument = {
			raw: { components: { schemas } },
			schemas,
			operations: {},
		};

		const expr = generateZodSchema(document, schemas.A, 'A');
		expect(expr).toContain('z.lazy(() => ASchema)');
	});
});
