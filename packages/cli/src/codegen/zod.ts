import { dereference, type OpenApiDocument } from '../openapi/loader';
import { baseType, isNullableType, type JsonSchema } from '../openapi/schema';

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const STRING_FORMAT_METHODS: Record<string, string> = {
	email: '.email()',
	uri: '.url()',
	url: '.url()',
	uuid: '.uuid()',
	'date-time': '.datetime({ offset: true })',
};

export function schemaBindingName(schemaName: string): string {
	return `${schemaName}Schema`;
}

function refName(ref: string): string {
	const parts = ref.split('/');
	return parts[parts.length - 1];
}

function propertyKey(key: string): string {
	return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function quote(value: string): string {
	return JSON.stringify(value);
}

function generateEnumSchema(values: readonly (string | number)[]): string {
	if (values.every((value) => typeof value === 'string')) {
		return `z.enum([${values.map((value) => quote(String(value))).join(', ')}])`;
	}
	const literals = values.map((value) => `z.literal(${typeof value === 'string' ? quote(value) : value})`);
	return `z.union([${literals.join(', ')}])`;
}

function generateStringSchema(schema: JsonSchema): string {
	if (schema.enum?.length) return generateEnumSchema(schema.enum);

	let expr = 'z.string()';
	if (schema.format) {
		const method = STRING_FORMAT_METHODS[schema.format];
		expr += method ?? '';
	}
	if (schema.minLength !== undefined) expr += `.min(${schema.minLength})`;
	if (schema.maxLength !== undefined) expr += `.max(${schema.maxLength})`;
	if (schema.format && !STRING_FORMAT_METHODS[schema.format]) {
		expr += ` /* @unchecked-string-format-${schema.format} */`;
	}
	return expr;
}

function generateNumberSchema(schema: JsonSchema, type: 'number' | 'integer'): string {
	let expr = type === 'integer' ? 'z.number().int()' : 'z.number()';
	if (schema.minimum !== undefined) expr += `.min(${schema.minimum})`;
	if (schema.maximum !== undefined) expr += `.max(${schema.maximum})`;
	return expr;
}

function generateArraySchema(document: OpenApiDocument, schema: JsonSchema, visiting: ReadonlySet<string>): string {
	const itemsExpr = schema.items ? build(document, schema.items, visiting) : '/* @unchecked-array-items */ z.unknown()';
	let expr = `z.array(${itemsExpr})`;
	if (schema.minItems !== undefined) expr += `.min(${schema.minItems})`;
	if (schema.maxItems !== undefined) expr += `.max(${schema.maxItems})`;
	return expr;
}

function generateObjectSchema(document: OpenApiDocument, schema: JsonSchema, visiting: ReadonlySet<string>): string {
	const properties = schema.properties ?? {};
	const hasProperties = Object.keys(properties).length > 0;

	if (!hasProperties && schema.additionalProperties && typeof schema.additionalProperties === 'object') {
		return `z.record(z.string(), ${build(document, schema.additionalProperties, visiting)})`;
	}

	const required = new Set(schema.required ?? []);
	const propEntries = Object.entries(properties).map(([key, propSchema]) => {
		let expr = build(document, propSchema, visiting);
		if (!required.has(key)) expr += '.optional()';
		return `${propertyKey(key)}: ${expr}`;
	});

	let expr = `z.object({ ${propEntries.join(', ')} })`;
	if (schema.additionalProperties === false) {
		expr += '.strict()';
	} else if (typeof schema.additionalProperties === 'object') {
		expr += `.catchall(${build(document, schema.additionalProperties, visiting)})`;
	}
	return expr;
}

function build(document: OpenApiDocument, schema: JsonSchema, visiting: ReadonlySet<string>): string {
	if (schema.$ref) {
		const name = refName(schema.$ref);
		if (visiting.has(name)) return `z.lazy(() => ${schemaBindingName(name)})`;
		return build(document, dereference(document.raw, schema), new Set(visiting).add(name));
	}

	if (schema.allOf?.length) {
		return schema.allOf.map((member) => build(document, member, visiting)).reduce((acc, part) => `${acc}.and(${part})`);
	}

	const variants = schema.oneOf ?? schema.anyOf;
	if (variants?.length) {
		const members = variants.map((member) => build(document, member, visiting));
		return members.length === 1 ? members[0] : `z.union([${members.join(', ')}])`;
	}

	const type = baseType(schema);
	let expr: string;
	switch (type) {
		case 'string':
			expr = generateStringSchema(schema);
			break;
		case 'number':
		case 'integer':
			expr = generateNumberSchema(schema, type);
			break;
		case 'boolean':
			expr = 'z.boolean()';
			break;
		case 'array':
			expr = generateArraySchema(document, schema, visiting);
			break;
		case 'object':
			expr = generateObjectSchema(document, schema, visiting);
			break;
		case 'null':
			expr = 'z.null()';
			break;
		default:
			expr = schema.enum?.length ? generateEnumSchema(schema.enum) : '/* @unchecked-schema-shape */ z.unknown()';
	}

	if (isNullableType(schema) && type !== 'null') {
		expr += '.nullable()';
	}

	return expr;
}

// Pass schemaName when generating a named schema's own definition, so a reference
// back to that name (direct or mutual recursion) breaks with z.lazy() instead of
// recursing forever.
export function generateZodSchema(document: OpenApiDocument, schema: JsonSchema, schemaName?: string): string {
	return build(document, schema, schemaName ? new Set([schemaName]) : new Set());
}
