export interface JsonSchema {
	type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | ('string' | 'null')[] | (string | 'null')[];
	enum?: readonly (string | number)[];
	format?: string;
	description?: string;
	default?: unknown;
	required?: readonly string[];
	properties?: Record<string, JsonSchema>;
	items?: JsonSchema;
	additionalProperties?: boolean | JsonSchema;
	minimum?: number;
	maximum?: number;
	minLength?: number;
	maxLength?: number;
	minItems?: number;
	maxItems?: number;
	nullable?: boolean;
	$ref?: string;
	allOf?: readonly JsonSchema[];
	anyOf?: readonly JsonSchema[];
	oneOf?: readonly JsonSchema[];
}

export function isNullableType(schema: JsonSchema): boolean {
	if (schema.nullable) return true;
	return Array.isArray(schema.type) && schema.type.includes('null');
}

export function baseType(schema: JsonSchema): string | undefined {
	if (Array.isArray(schema.type)) {
		return schema.type.find((t) => t !== 'null');
	}
	return schema.type;
}
