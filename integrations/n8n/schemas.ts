import type { Equal, ExtractBody, Expect } from '@featurebase-connect-sdk/types';
import { z } from 'zod';

const authorInputSchema = z.object({
	id: z.string().optional(),
	userId: z.string().max(255).optional(),
	email: z.string().email().optional(),
	name: z.string().max(255).optional(),
	profilePicture: z.string().optional(),
});

const integrationsSchema = z.object({
	linear: z.boolean().optional(),
	clickup: z.boolean().optional(),
	github: z.boolean().optional(),
	jira: z.boolean().optional(),
	discord: z.boolean().optional(),
	slack: z.boolean().optional(),
});

const customFieldValueSchema = z.union([z.array(z.string().max(1000)).max(100), z.boolean(), z.number(), z.string(), z.string().nullable()]);

const tagsSchema = z.union([z.string().max(255), z.array(z.string().max(255)).max(50)]);

const visibilitySchema = z.enum(['public', 'authorOnly', 'companyOnly']);

export const createPostSchema = z
	.object({
		title: z.string().min(2).max(512),
		boardId: z.string(),
		content: z.string().optional(),
		tags: tagsSchema.optional(),
		commentsEnabled: z.boolean().nullable().optional(),
		statusId: z.string().optional(),
		author: authorInputSchema.optional(),
		inReview: z.boolean().nullable().optional(),
		customFields: z.record(z.string(), customFieldValueSchema).optional(),
		eta: z.string().nullable().optional(),
		createdAt: z.string().nullable().optional(),
		assigneeId: z.string().optional(),
		visibility: visibilitySchema.optional(),
		upvotes: z.number().int().min(0).nullable().optional(),
		notifyAdmins: z.boolean().optional(),
		integrations: integrationsSchema.optional(),
	})
	.strict();

export type CreatePostBody = z.infer<typeof createPostSchema>;
export type _CreatePostBodyMatchesSpec = Expect<Equal<CreatePostBody, ExtractBody<'createPost'>>>;

export const updatePostSchema = z
	.object({
		title: z.string().min(2).max(512).optional(),
		content: z.string().optional(),
		boardId: z.string().optional(),
		tags: tagsSchema.optional(),
		commentsEnabled: z.boolean().nullable().optional(),
		statusId: z.string().optional(),
		// The spec's allOf here just adds a description on top of AuthorInput, no extra fields.
		author: authorInputSchema.optional(),
		inReview: z.boolean().nullable().optional(),
		customFields: z.record(z.string(), customFieldValueSchema).optional(),
		eta: z.string().nullable().optional(),
		createdAt: z.string().nullable().optional(),
		sendStatusUpdateEmail: z.boolean().nullable().optional(),
		assigneeId: z.string().nullable().optional(),
		visibility: visibilitySchema.optional(),
		upvotes: z.number().int().min(0).nullable().optional(),
	})
	.strict();

export type UpdatePostBody = z.infer<typeof updatePostSchema>;
export type _UpdatePostBodyMatchesSpec = Expect<Equal<UpdatePostBody, ExtractBody<'updatePost'>>>;
