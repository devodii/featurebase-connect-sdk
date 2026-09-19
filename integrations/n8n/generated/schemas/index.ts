import { createPostSchema } from './createPost';
import { updatePostSchema } from './updatePost';
import { type ZodTypeAny } from 'zod';
export const n8nSchemas: Record<string, ZodTypeAny> = { createPost: createPostSchema, updatePost: updatePostSchema };
