import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

const BoardAccess = z
	.object({ adminOnly: z.boolean(), segments: z.array(z.string()), allowedRoles: z.array(z.string()), deniedRoles: z.array(z.string()) })
	.passthrough();
const BoardFeatures = z.object({ postingEnabled: z.boolean(), commentsEnabled: z.boolean(), createdDatesVisible: z.boolean() }).passthrough();
const BoardPostDefaults = z.object({ visibility: z.enum(['public', 'authorOnly', 'companyOnly']) }).passthrough();
const BoardLocalization = z
	.object({
		name: z.record(z.string()),
		description: z.union([z.record(z.string()), z.null()]),
		formPlaceholder: z.union([z.record(z.string()), z.null()]),
		heroTitle: z.union([z.record(z.string()), z.null()]),
		heroDescription: z.union([z.record(z.string()), z.null()]),
		submitButtonText: z.union([z.record(z.string()), z.null()]),
	})
	.passthrough();
const Board = z
	.object({
		object: z.literal('board'),
		id: z.string(),
		name: z.string(),
		icon: z.union([
			z.object({ type: z.literal('emoji'), value: z.string() }).passthrough(),
			z.object({ type: z.literal('icon'), value: z.string() }).passthrough(),
			z.object({ type: z.literal('url'), value: z.string().url() }).passthrough(),
			z.null(),
		]),
		access: BoardAccess,
		features: BoardFeatures,
		postDefaults: BoardPostDefaults,
		customFields: z.array(z.string()),
		localization: BoardLocalization,
		createdAt: z.string(),
	})
	.passthrough();
const BoardList = z.array(Board);
const ValidationError = z
	.object({
		error: z
			.object({
				type: z.literal('invalid_request_error'),
				code: z.enum([
					'invalid_id',
					'invalid_parameter',
					'missing_parameter',
					'invalid_cursor',
					'invalid_content',
					'invalid_request',
					'contact_not_customer',
					'contact_not_attached',
					'parameter_not_supported',
					'business_validation_error',
				]),
				message: z.string(),
				param: z.string().optional(),
				status: z.literal(400),
				details: z.array(z.object({ path: z.string(), message: z.string() }).passthrough()).optional(),
			})
			.passthrough(),
	})
	.passthrough();
const NotFoundError = z
	.object({
		error: z
			.object({
				type: z.literal('invalid_request_error'),
				code: z.enum([
					'resource_not_found',
					'post_not_found',
					'comment_not_found',
					'changelog_not_found',
					'admin_not_found',
					'contact_not_found',
					'conversation_not_found',
					'conversation_part_not_found',
					'team_not_found',
					'survey_not_found',
					'company_not_found',
					'help_center_not_found',
					'collection_not_found',
					'article_not_found',
					'custom_field_not_found',
					'board_not_found',
					'voter_not_found',
					'participant_not_found',
					'webhook_not_found',
					'redirect_rule_not_found',
					'brand_not_found',
					'version_not_supported',
				]),
				message: z.string(),
				status: z.literal(404),
			})
			.passthrough(),
	})
	.passthrough();
const ServerError = z
	.object({
		error: z
			.object({
				type: z.literal('api_error'),
				code: z.enum(['database_error', 'internal_error', 'fetch_error', 'create_error', 'update_error', 'delete_error']),
				message: z.string(),
				status: z.literal(500),
			})
			.passthrough(),
	})
	.passthrough();
const boardId = z.union([z.string(), z.array(z.string())]).optional();
const tags = z.union([z.string(), z.array(z.string().max(255))]).optional();
const inReview = z.union([z.boolean(), z.null()]).optional();
const PostAuthor = z.union([
	z
		.object({
			id: z.union([z.string(), z.null()]),
			name: z.string(),
			email: z.union([z.string(), z.null()]),
			profilePicture: z.union([z.string(), z.null()]),
			type: z.enum(['admin', 'customer', 'guest', 'integration', 'bot', 'lead']),
		})
		.passthrough(),
	z.null(),
]);
const PostStatus = z
	.object({
		object: z.literal('post_status'),
		id: z.string(),
		name: z.string(),
		color: z.string(),
		type: z.enum(['reviewing', 'unstarted', 'active', 'completed', 'canceled']),
		isDefault: z.boolean(),
	})
	.passthrough();
const PostTag = z.object({ id: z.string(), name: z.string(), color: z.union([z.string(), z.null()]) }).passthrough();
const PostFeatures = z.object({ commentsEnabled: z.boolean() }).passthrough();
const PostAccess = z.object({ userIds: z.array(z.string()), companyExternalIds: z.array(z.string()) }).passthrough();
const Post = z
	.object({
		object: z.literal('post'),
		id: z.string(),
		slug: z.string(),
		postUrl: z.string(),
		title: z.string(),
		content: z.string(),
		boardId: z.string(),
		author: PostAuthor,
		status: PostStatus,
		tags: z.array(PostTag),
		features: PostFeatures,
		upvotes: z.number(),
		commentCount: z.number(),
		inReview: z.boolean(),
		isPinned: z.boolean(),
		access: PostAccess,
		assigneeId: z.union([z.string(), z.null()]),
		eta: z.union([z.string(), z.null()]),
		customFields: z.object({}).partial().passthrough(),
		createdAt: z.string(),
		updatedAt: z.string(),
		integrations: z
			.object({
				linear: z.array(z.object({ issueId: z.string(), issueUrl: z.union([z.string(), z.null()]) }).passthrough()),
				jira: z.array(z.object({ issueId: z.string(), issueUrl: z.union([z.string(), z.null()]) }).passthrough()),
				clickup: z.array(z.object({ id: z.string(), url: z.string(), title: z.string() }).passthrough()),
				github: z.array(
					z
						.object({ id: z.string(), number: z.string(), repositoryName: z.string(), repositoryFullName: z.string(), url: z.string(), title: z.string() })
						.passthrough(),
				),
				devops: z.array(z.object({ id: z.number(), url: z.string(), projectId: z.string(), projectName: z.string(), title: z.string() }).passthrough()),
				hubspot: z.array(
					z
						.object({
							objectId: z.number(),
							type: z.enum(['TICKET', 'DEAL', 'CONTACT']),
							dealAmount: z.union([z.number(), z.null()]),
							dealClosed: z.union([z.boolean(), z.null()]),
						})
						.passthrough(),
				),
				salesforce: z.array(
					z
						.object({
							objectId: z.string(),
							objectType: z.enum(['Opportunity', 'Case']),
							amount: z.union([z.number(), z.null()]),
							isClosed: z.union([z.boolean(), z.null()]),
						})
						.passthrough(),
				),
			})
			.passthrough(),
		opportunityAmount: z.union([z.number(), z.null()]),
	})
	.passthrough();
const PaginationMetadata = z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough();
const PostList = z
	.object({ object: z.literal('list'), data: z.array(Post), nextCursor: z.union([z.string(), z.null()]), pagination: PaginationMetadata.optional() })
	.passthrough();
const AuthorInput = z
	.object({ id: z.string(), userId: z.string().max(255), email: z.string().email(), name: z.string().max(255), profilePicture: z.string() })
	.partial()
	.passthrough();
const CreatePostBody = z.object({
	title: z.string().min(2).max(512),
	content: z.string().optional().default(''),
	boardId: z.string(),
	tags: z.union([z.string(), z.array(z.string().max(255))]).optional(),
	commentsEnabled: z.union([z.boolean(), z.null()]).optional().default(true),
	statusId: z.string().optional(),
	author: AuthorInput.optional(),
	inReview: z.union([z.boolean(), z.null()]).optional().default(false),
	customFields: z
		.record(z.union([z.array(z.string().max(1000)), z.boolean(), z.number(), z.string(), z.string(), z.union([z.string(), z.null()]), z.null(), z.null()]))
		.optional(),
	eta: z.union([z.string(), z.null()]).optional(),
	createdAt: z.union([z.string(), z.null()]).optional(),
	assigneeId: z.string().optional(),
	visibility: z.enum(['public', 'authorOnly', 'companyOnly']).optional(),
	upvotes: z.union([z.number(), z.null()]).optional(),
	notifyAdmins: z.boolean().optional().default(false),
	integrations: z
		.object({
			linear: z.boolean().default(false),
			clickup: z.boolean().default(false),
			github: z.boolean().default(false),
			jira: z.boolean().default(false),
			discord: z.boolean().default(false),
			slack: z.boolean().default(false),
		})
		.partial()
		.passthrough()
		.optional()
		.default({}),
});
const UpdatePostBody = z
	.object({
		title: z.string().min(2).max(512),
		content: z.string(),
		boardId: z.string(),
		tags: z.union([z.string(), z.array(z.string().max(255))]),
		commentsEnabled: z.union([z.boolean(), z.null()]),
		statusId: z.string(),
		inReview: z.union([z.boolean(), z.null()]),
		customFields: z.record(
			z.union([z.array(z.string().max(1000)), z.boolean(), z.number(), z.string(), z.string(), z.union([z.string(), z.null()]), z.null(), z.null()]),
		),
		eta: z.union([z.string(), z.null()]),
		createdAt: z.union([z.string(), z.null()]),
		sendStatusUpdateEmail: z.union([z.boolean(), z.null()]),
		assigneeId: z.union([z.string(), z.null()]),
		visibility: z.enum(['public', 'authorOnly', 'companyOnly']),
		author: AuthorInput.and(z.unknown()),
		upvotes: z.union([z.number(), z.null()]),
	})
	.partial();
const DeletedPost = z.object({ id: z.string(), object: z.literal('post'), deleted: z.literal(true) }).passthrough();
const Company = z
	.object({
		object: z.literal('company'),
		id: z.string(),
		companyId: z.string(),
		name: z.string(),
		monthlySpend: z.union([z.number(), z.null()]),
		industry: z.union([z.string(), z.null()]),
		website: z.union([z.string(), z.null()]),
		plan: z.union([z.string(), z.null()]),
		linkedUsers: z.union([z.number(), z.null()]),
		companySize: z.union([z.number(), z.null()]),
		lastActivity: z.union([z.string(), z.null()]),
		customFields: z.object({}).partial().passthrough().optional(),
		createdAt: z.union([z.string(), z.null()]),
		updatedAt: z.union([z.string(), z.null()]),
	})
	.passthrough();
const User = z
	.object({
		object: z.literal('contact'),
		id: z.string(),
		userId: z.string().optional(),
		organizationId: z.string().optional(),
		companies: z.array(Company).optional(),
		email: z.union([z.string(), z.null()]).optional(),
		name: z.string(),
		profilePicture: z.union([z.string(), z.null()]).optional(),
		commentsCreated: z.number().optional(),
		postsCreated: z.number().optional(),
		lastActivity: z.string().optional(),
		subscribedToChangelog: z.boolean().optional(),
		manuallyOptedOutFromChangelog: z.boolean().optional(),
		roles: z.array(z.string()).optional(),
		locale: z.string().optional(),
		verified: z.boolean().optional(),
		type: z.enum(['admin', 'customer', 'guest', 'integration', 'bot', 'lead']),
		description: z.string().optional(),
		customFields: z.object({}).partial().passthrough().optional(),
	})
	.passthrough();
const UserList = z
	.object({
		object: z.literal('list'),
		data: z.array(User),
		nextCursor: z.union([z.string(), z.null()]),
		pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough().optional(),
	})
	.passthrough();
const AddVoterBody = z
	.object({ id: z.string(), userId: z.string().max(255), email: z.string().email(), name: z.string().max(255), profilePicture: z.string() })
	.partial();
const AddVoterResponse = z.object({ object: z.literal('voter'), added: z.literal(true), id: z.string(), postId: z.string() }).passthrough();
const RemoveVoterBody = z.object({ id: z.string(), userId: z.string().max(255), email: z.string().email() }).partial();
const RemoveVoterResponse = z.object({ object: z.literal('voter'), removed: z.literal(true), id: z.string(), postId: z.string() }).passthrough();
const PostStatusList = z.array(PostStatus);
const CommentAuthor = z.union([
	z
		.object({
			id: z.union([z.string(), z.null()]),
			name: z.string(),
			profilePicture: z.union([z.string(), z.null()]),
			type: z.enum(['admin', 'customer', 'guest', 'integration', 'bot', 'lead']),
		})
		.passthrough(),
	z.null(),
]);
const Comment = z
	.object({
		object: z.literal('comment'),
		id: z.string(),
		postId: z.union([z.string(), z.null()]),
		changelogId: z.union([z.string(), z.null()]),
		parentCommentId: z.union([z.string(), z.null()]),
		content: z.string(),
		author: CommentAuthor,
		upvotes: z.number(),
		downvotes: z.number(),
		score: z.number(),
		isPrivate: z.boolean(),
		isDeleted: z.boolean(),
		isPinned: z.boolean(),
		inReview: z.boolean(),
		isSpam: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const CommentList = z
	.object({
		object: z.literal('list'),
		data: z.array(Comment),
		nextCursor: z.union([z.string(), z.null()]),
		pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough().optional(),
	})
	.passthrough();
const CreateCommentBody = z.object({
	content: z.string().min(2),
	postId: z.string().optional(),
	changelogId: z.string().optional(),
	parentCommentId: z.string().optional(),
	isPrivate: z.union([z.boolean(), z.null()]).optional().default(false),
	sendNotification: z.union([z.boolean(), z.null()]).optional().default(true),
	author: AuthorInput.and(z.unknown()).optional(),
	createdAt: z.union([z.string(), z.null()]).optional(),
	upvotes: z.union([z.number(), z.null()]).optional(),
	downvotes: z.union([z.number(), z.null()]).optional(),
});
const UpdateCommentBody = z
	.object({
		content: z.string().min(2),
		isPrivate: z.union([z.boolean(), z.null()]),
		isPinned: z.union([z.boolean(), z.null()]),
		inReview: z.union([z.boolean(), z.null()]),
		createdAt: z.union([z.string(), z.null()]),
		upvotes: z.union([z.number(), z.null()]),
		downvotes: z.union([z.number(), z.null()]),
	})
	.partial();
const DeletedComment = z.object({ id: z.string(), object: z.literal('comment'), deleted: z.literal(true) }).passthrough();
const startDate = z.union([z.string(), z.null()]).optional();
const ChangelogCategory = z.object({ id: z.string(), name: z.string(), roles: z.array(z.string()).optional() }).passthrough();
const ChangelogLocaleNotification = z
	.object({
		sendEmailNotification: z.boolean().optional(),
		hideFromBoardAndWidgets: z.boolean().optional(),
		scheduledDate: z.union([z.string(), z.null()]),
		emailSent: z.boolean().optional(),
	})
	.passthrough();
const Changelog = z
	.object({
		object: z.literal('changelog'),
		id: z.string(),
		title: z.string(),
		slug: z.string(),
		url: z.string(),
		content: z.string(),
		markdownContent: z.union([z.string(), z.null()]),
		featuredImage: z.union([z.string(), z.null()]),
		date: z.string(),
		state: z.enum(['live', 'draft']),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		isPublished: z.boolean(),
		isDraftDiffersFromLive: z.boolean(),
		publishedLocales: z.array(z.string()),
		availableLocales: z.array(z.string()),
		slugs: z.record(z.string()),
		commentCount: z.number(),
		categories: z.array(ChangelogCategory),
		organization: z.string(),
		notifications: z.record(ChangelogLocaleNotification),
		allowedSegmentIds: z.array(z.string()),
		emailSentToSubscribers: z.boolean(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const ChangelogList = z
	.object({
		object: z.literal('list'),
		data: z.array(Changelog),
		nextCursor: z.union([z.string(), z.null()]),
		pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough().optional(),
	})
	.passthrough();
const CreateChangelogBody = z.object({
	title: z.string().min(1).max(512),
	htmlContent: z.string().optional(),
	markdownContent: z.string().optional(),
	categories: z.array(z.string().max(255)).max(100).optional(),
	featuredImage: z.string().optional(),
	allowedSegmentIds: z.array(z.string()).max(100).optional(),
	locale: z
		.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		])
		.optional(),
	date: z.union([z.string(), z.null()]).optional(),
	state: z.enum(['draft', 'live']).optional().default('draft'),
});
const UpdateChangelogBody = z
	.object({
		title: z.string().min(1).max(512),
		htmlContent: z.string(),
		markdownContent: z.string(),
		categories: z.array(z.string().max(255)).max(100),
		featuredImage: z.string(),
		allowedSegmentIds: z.array(z.string()).max(100),
		date: z.union([z.string(), z.null()]),
	})
	.partial();
const DeletedChangelog = z.object({ id: z.string(), object: z.literal('changelog'), deleted: z.literal(true) }).passthrough();
const PublishChangelogBody = z
	.object({
		sendEmail: z.union([z.boolean(), z.null()]).default(false),
		locales: z
			.array(
				z.enum([
					'bn',
					'bs',
					'pt-BR',
					'bg',
					'ca',
					'hr',
					'cs',
					'da',
					'nl',
					'en',
					'et',
					'fi',
					'fr',
					'de',
					'el',
					'hi',
					'hu',
					'id',
					'it',
					'ja',
					'ko',
					'lv',
					'lt',
					'ms',
					'mn',
					'nb',
					'pl',
					'pt',
					'ro',
					'ru',
					'sr',
					'zh-CN',
					'sk',
					'sl',
					'es',
					'sw',
					'sv',
					'th',
					'zh-TW',
					'tr',
					'uk',
					'vi',
				]),
			)
			.default([]),
		scheduledDate: z.union([z.string(), z.null(), z.null()]),
	})
	.partial();
const PublishUnpublishSuccess = z.object({ success: z.literal(true), state: z.enum(['published', 'scheduled', 'unpublished']).optional() }).passthrough();
const UnpublishChangelogBody = z
	.object({
		locales: z
			.array(
				z.enum([
					'bn',
					'bs',
					'pt-BR',
					'bg',
					'ca',
					'hr',
					'cs',
					'da',
					'nl',
					'en',
					'et',
					'fi',
					'fr',
					'de',
					'el',
					'hi',
					'hu',
					'id',
					'it',
					'ja',
					'ko',
					'lv',
					'lt',
					'ms',
					'mn',
					'nb',
					'pl',
					'pt',
					'ro',
					'ru',
					'sr',
					'zh-CN',
					'sk',
					'sl',
					'es',
					'sw',
					'sv',
					'th',
					'zh-TW',
					'tr',
					'uk',
					'vi',
				]),
			)
			.default([]),
	})
	.partial();
const AddChangelogSubscribersBody = z.object({
	emails: z.array(z.string().email()).min(1).max(1000),
	locale: z
		.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		])
		.optional(),
});
const ChangelogSubscribersImport = z.object({ object: z.literal('changelog_subscribers_import'), count: z.number() }).passthrough();
const RemoveChangelogSubscribersBody = z.object({ emails: z.array(z.string().email()).min(1).max(1000) });
const ChangelogSubscribersRemoval = z.object({ object: z.literal('changelog_subscribers_removal'), count: z.number() }).passthrough();
const Admin = z
	.object({
		object: z.literal('admin'),
		id: z.string(),
		name: z.string().optional(),
		email: z.string().optional(),
		profilePicture: z.union([z.string(), z.null()]).optional(),
		roleId: z.string().optional(),
	})
	.passthrough();
const AdminList = z
	.object({
		object: z.literal('list'),
		data: z.array(Admin),
		nextCursor: z.union([z.string(), z.null()]),
		pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough().optional(),
	})
	.passthrough();
const AdminRolePermissions = z
	.object({
		view_comments_private: z.boolean(),
		manage_comments: z.boolean(),
		manage_comments_private: z.boolean(),
		set_comment_pinned: z.boolean(),
		moderate_comments: z.boolean(),
		set_post_category: z.boolean(),
		set_post_pinned: z.boolean(),
		set_post_eta: z.boolean(),
		set_post_tags: z.boolean(),
		set_post_author: z.boolean(),
		set_post_status: z.boolean(),
		set_post_assignee: z.boolean(),
		set_post_custom_fields: z.boolean(),
		post_vote_on_behalf: z.boolean(),
		post_merge: z.boolean(),
		post_import: z.boolean(),
		post_export: z.boolean(),
		moderate_posts: z.boolean(),
		view_users: z.boolean(),
		manage_users: z.boolean(),
		view_posts_private: z.boolean(),
		view_private_post_tags: z.boolean(),
		manage_changelogs: z.boolean(),
		manage_surveys: z.boolean(),
		manage_branding: z.boolean(),
		manage_billing: z.boolean(),
		manage_team_members: z.boolean(),
		manage_sso: z.boolean(),
		manage_api: z.boolean(),
		manage_statuses: z.boolean(),
		manage_boards: z.boolean(),
		manage_post_tags: z.boolean(),
		manage_custom_fields: z.boolean(),
		manage_moderation_settings: z.boolean(),
		manage_roadmap: z.boolean(),
		manage_user_roles: z.boolean(),
		manage_prioritization: z.boolean(),
		manage_notifications: z.boolean(),
		manage_custom_domain: z.boolean(),
		manage_integrations: z.boolean(),
		use_integrations: z.boolean(),
		manage_help_center: z.boolean(),
		auto_approve_posts: z.boolean(),
		set_conversation_tags: z.boolean(),
		manage_conversation_tags: z.boolean(),
	})
	.partial()
	.passthrough();
const AdminRole = z.object({ object: z.literal('admin_role'), id: z.string(), name: z.string(), permissions: AdminRolePermissions }).passthrough();
const AdminRoleList = z.object({ object: z.literal('list'), data: z.array(AdminRole), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const CustomFieldOption = z.object({ id: z.string(), label: z.string() }).passthrough();
const CustomField = z
	.object({
		object: z.literal('custom_field'),
		id: z.string(),
		label: z.string(),
		type: z.enum(['text', 'number', 'select', 'multi-select', 'checkbox', 'date', 'file']),
		required: z.boolean().optional(),
		allowMultiple: z.boolean().optional(),
		placeholder: z.string().optional(),
		public: z.boolean().optional(),
		internal: z.boolean().optional(),
		options: z.array(CustomFieldOption).optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional(),
	})
	.passthrough();
const CustomFieldList = z
	.object({
		object: z.literal('list'),
		data: z.array(CustomField),
		nextCursor: z.union([z.string(), z.null()]),
		pagination: z.object({ page: z.number(), limit: z.number(), total: z.number(), totalPages: z.number() }).passthrough().optional(),
	})
	.passthrough();
const SurveyUrlTargeting = z.object({ value: z.string(), matchType: z.enum(['exact', 'contains', 'regex']), id: z.string().optional() }).passthrough();
const SurveyCssTargeting = z.object({ value: z.string() }).passthrough();
const SurveyTargeting = z
	.object({ segmentIds: z.array(z.string()), url: z.array(SurveyUrlTargeting), css: z.array(SurveyCssTargeting), loginRequired: z.boolean() })
	.partial()
	.passthrough();
const SurveyChoice = z.object({ id: z.string(), choice: z.string().optional() }).passthrough();
const SurveyNextAction = z.object({ type: z.enum(['page', 'end', 'next']), pageId: z.string().optional() }).passthrough();
const SurveyPageLogic = z
	.object({ id: z.string().optional(), comparator: z.string(), value: z.union([z.string(), z.number(), z.array(z.string())]), next: SurveyNextAction })
	.passthrough();
const SurveyPage = z
	.object({
		id: z.string(),
		type: z.enum(['text', 'link', 'rating', 'multiple-choice']),
		title: z.string(),
		description: z.string().optional(),
		placeholder: z.string().optional(),
		linkButtonText: z.string().optional(),
		linkRedirectUrl: z.string().optional(),
		linkTarget: z.enum(['_blank', '_self', '_parent', '_top']).optional(),
		subType: z.enum(['number', 'emoji', 'generic', 'featurebase-posts', 'nps']).optional(),
		scale: z.number().optional(),
		lowLabel: z.string().optional(),
		highLabel: z.string().optional(),
		allowSelectMultiple: z.boolean().optional(),
		choices: z.array(SurveyChoice).optional(),
		logic: z.array(SurveyPageLogic).optional(),
		defaultAction: SurveyNextAction.and(z.unknown()).optional(),
	})
	.passthrough();
const Survey = z
	.object({
		object: z.literal('survey'),
		id: z.string(),
		title: z.string(),
		description: z.string().optional(),
		isActive: z.boolean(),
		organization: z.string(),
		responseCount: z.number(),
		targeting: SurveyTargeting.optional(),
		pages: z.array(SurveyPage),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const SurveyList = z.object({ object: z.literal('list'), data: z.array(Survey), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const Contact = z.union([
	z
		.object({
			object: z.literal('contact'),
			id: z.string(),
			userId: z.string().optional(),
			organizationId: z.string().optional(),
			companies: z.array(Company).optional(),
			email: z.union([z.string(), z.null()]).optional(),
			name: z.string(),
			profilePicture: z.union([z.string(), z.null()]).optional(),
			commentsCreated: z.number().optional(),
			postsCreated: z.number().optional(),
			lastActivity: z.string().optional(),
			subscribedToChangelog: z.boolean().optional(),
			manuallyOptedOutFromChangelog: z.boolean().optional(),
			roles: z.array(z.string()).optional(),
			locale: z.string().optional(),
			verified: z.boolean().optional(),
			type: z.enum(['customer', 'lead']),
			description: z.string().optional(),
			customFields: z.object({}).partial().passthrough().optional(),
		})
		.passthrough(),
	z.null(),
]);
const SurveySingleResponse = z
	.object({
		pageId: z.string(),
		type: z.enum(['text', 'link', 'rating', 'multiple-choice']),
		value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
		id: z.string().optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional(),
	})
	.passthrough();
const SurveyResponse = z
	.object({ object: z.literal('survey_response'), id: z.string(), user: Contact, responses: z.array(SurveySingleResponse), createdAt: z.string() })
	.passthrough();
const SurveyResponseList = z.object({ object: z.literal('list'), data: z.array(SurveyResponse), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const HelpCenterNavItem = z
	.object({ type: z.enum(['link', 'button']), title: z.string(), url: z.string(), icon: z.union([z.string(), z.null()]).optional() })
	.passthrough();
const HelpCenterUrls = z.object({ featurebaseSubpath: z.string(), externalDomain: z.string() }).partial().passthrough();
const HelpCenterTranslation = z
	.object({ displayName: z.string(), title: z.string(), description: z.string(), searchPlaceholder: z.string(), navItems: z.array(HelpCenterNavItem) })
	.partial()
	.passthrough();
const HelpCenter = z
	.object({
		object: z.literal('help_center'),
		id: z.string(),
		displayName: z.string().optional(),
		title: z.string().optional(),
		description: z.string().optional(),
		searchPlaceholder: z.string().optional(),
		isPublic: z.boolean(),
		hideAuthorInfo: z.boolean().optional(),
		hideDateInfo: z.boolean().optional(),
		externalLinksOpenInNewTab: z.boolean().optional(),
		internalLinksOpenInNewTab: z.boolean().optional(),
		defaultLocale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		availableLocales: z.array(
			z.enum([
				'bn',
				'bs',
				'pt-BR',
				'bg',
				'ca',
				'hr',
				'cs',
				'da',
				'nl',
				'en',
				'et',
				'fi',
				'fr',
				'de',
				'el',
				'hi',
				'hu',
				'id',
				'it',
				'ja',
				'ko',
				'lv',
				'lt',
				'ms',
				'mn',
				'nb',
				'pl',
				'pt',
				'ro',
				'ru',
				'sr',
				'zh-CN',
				'sk',
				'sl',
				'es',
				'sw',
				'sv',
				'th',
				'zh-TW',
				'tr',
				'uk',
				'vi',
			]),
		),
		navItems: z.array(HelpCenterNavItem).optional(),
		urls: HelpCenterUrls.optional(),
		translations: z
			.object({
				bn: HelpCenterTranslation,
				bs: HelpCenterTranslation,
				'pt-BR': HelpCenterTranslation,
				bg: HelpCenterTranslation,
				ca: HelpCenterTranslation,
				hr: HelpCenterTranslation,
				cs: HelpCenterTranslation,
				da: HelpCenterTranslation,
				nl: HelpCenterTranslation,
				en: HelpCenterTranslation,
				et: HelpCenterTranslation,
				fi: HelpCenterTranslation,
				fr: HelpCenterTranslation,
				de: HelpCenterTranslation,
				el: HelpCenterTranslation,
				hi: HelpCenterTranslation,
				hu: HelpCenterTranslation,
				id: HelpCenterTranslation,
				it: HelpCenterTranslation,
				ja: HelpCenterTranslation,
				ko: HelpCenterTranslation,
				lv: HelpCenterTranslation,
				lt: HelpCenterTranslation,
				ms: HelpCenterTranslation,
				mn: HelpCenterTranslation,
				nb: HelpCenterTranslation,
				pl: HelpCenterTranslation,
				pt: HelpCenterTranslation,
				ro: HelpCenterTranslation,
				ru: HelpCenterTranslation,
				sr: HelpCenterTranslation,
				'zh-CN': HelpCenterTranslation,
				sk: HelpCenterTranslation,
				sl: HelpCenterTranslation,
				es: HelpCenterTranslation,
				sw: HelpCenterTranslation,
				sv: HelpCenterTranslation,
				th: HelpCenterTranslation,
				'zh-TW': HelpCenterTranslation,
				tr: HelpCenterTranslation,
				uk: HelpCenterTranslation,
				vi: HelpCenterTranslation,
			})
			.partial()
			.passthrough()
			.optional(),
		organization: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const HelpCenterList = z.object({ object: z.literal('list'), data: z.array(HelpCenter), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const CollectionIcon = z.union([z.object({ type: z.string(), value: z.string() }).passthrough(), z.null()]);
const CollectionAuthor = z
	.object({ name: z.string(), authorId: z.string(), avatarUrl: z.union([z.string(), z.null()]) })
	.partial()
	.passthrough();
const CollectionTranslation = z
	.object({
		name: z.string(),
		description: z.string(),
		slug: z.string(),
		featurebaseUrl: z.string(),
		externalUrl: z.string(),
		articleCount: z.number(),
		authorCount: z.number(),
		authors: z.array(CollectionAuthor),
	})
	.partial()
	.passthrough();
const Collection = z
	.object({
		object: z.literal('collection'),
		id: z.string(),
		name: z.string().optional(),
		description: z.string().optional(),
		slug: z.string().optional(),
		icon: CollectionIcon.optional(),
		parentId: z.union([z.string(), z.null()]),
		helpCenterId: z.string(),
		organization: z.string(),
		defaultLocale: z
			.enum([
				'bn',
				'bs',
				'pt-BR',
				'bg',
				'ca',
				'hr',
				'cs',
				'da',
				'nl',
				'en',
				'et',
				'fi',
				'fr',
				'de',
				'el',
				'hi',
				'hu',
				'id',
				'it',
				'ja',
				'ko',
				'lv',
				'lt',
				'ms',
				'mn',
				'nb',
				'pl',
				'pt',
				'ro',
				'ru',
				'sr',
				'zh-CN',
				'sk',
				'sl',
				'es',
				'sw',
				'sv',
				'th',
				'zh-TW',
				'tr',
				'uk',
				'vi',
			])
			.optional(),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		availableLocales: z.array(
			z.enum([
				'bn',
				'bs',
				'pt-BR',
				'bg',
				'ca',
				'hr',
				'cs',
				'da',
				'nl',
				'en',
				'et',
				'fi',
				'fr',
				'de',
				'el',
				'hi',
				'hu',
				'id',
				'it',
				'ja',
				'ko',
				'lv',
				'lt',
				'ms',
				'mn',
				'nb',
				'pl',
				'pt',
				'ro',
				'ru',
				'sr',
				'zh-CN',
				'sk',
				'sl',
				'es',
				'sw',
				'sv',
				'th',
				'zh-TW',
				'tr',
				'uk',
				'vi',
			]),
		),
		featurebaseUrl: z.string().optional(),
		externalUrl: z.string().optional(),
		articleCount: z.number().optional(),
		authorCount: z.number().optional(),
		order: z.union([z.number(), z.null()]).optional(),
		path: z.string().optional(),
		collapseSidebar: z.boolean().optional(),
		translations: z
			.object({
				bn: CollectionTranslation,
				bs: CollectionTranslation,
				'pt-BR': CollectionTranslation,
				bg: CollectionTranslation,
				ca: CollectionTranslation,
				hr: CollectionTranslation,
				cs: CollectionTranslation,
				da: CollectionTranslation,
				nl: CollectionTranslation,
				en: CollectionTranslation,
				et: CollectionTranslation,
				fi: CollectionTranslation,
				fr: CollectionTranslation,
				de: CollectionTranslation,
				el: CollectionTranslation,
				hi: CollectionTranslation,
				hu: CollectionTranslation,
				id: CollectionTranslation,
				it: CollectionTranslation,
				ja: CollectionTranslation,
				ko: CollectionTranslation,
				lv: CollectionTranslation,
				lt: CollectionTranslation,
				ms: CollectionTranslation,
				mn: CollectionTranslation,
				nb: CollectionTranslation,
				pl: CollectionTranslation,
				pt: CollectionTranslation,
				ro: CollectionTranslation,
				ru: CollectionTranslation,
				sr: CollectionTranslation,
				'zh-CN': CollectionTranslation,
				sk: CollectionTranslation,
				sl: CollectionTranslation,
				es: CollectionTranslation,
				sw: CollectionTranslation,
				sv: CollectionTranslation,
				th: CollectionTranslation,
				'zh-TW': CollectionTranslation,
				tr: CollectionTranslation,
				uk: CollectionTranslation,
				vi: CollectionTranslation,
			})
			.partial()
			.passthrough()
			.optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const CollectionList = z.object({ object: z.literal('list'), data: z.array(Collection), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const CollectionIcon_Nova = z.union([z.object({ type: z.enum(['emoji', 'predefined']), value: z.string().max(255) }).passthrough(), z.null()]);
const CollectionTranslationInput_Nova = z
	.object({ name: z.string().max(255), description: z.string().max(512) })
	.partial()
	.passthrough();
const CreateCollectionBody_Nova = z.object({
	name: z.string().max(255),
	description: z.string().max(512).optional(),
	icon: CollectionIcon_Nova.and(z.unknown()).optional(),
	parentId: z.union([z.string(), z.null()]).optional(),
	translations: z
		.object({
			bn: CollectionTranslationInput_Nova,
			bs: CollectionTranslationInput_Nova,
			'pt-BR': CollectionTranslationInput_Nova,
			bg: CollectionTranslationInput_Nova,
			ca: CollectionTranslationInput_Nova,
			hr: CollectionTranslationInput_Nova,
			cs: CollectionTranslationInput_Nova,
			da: CollectionTranslationInput_Nova,
			nl: CollectionTranslationInput_Nova,
			en: CollectionTranslationInput_Nova,
			et: CollectionTranslationInput_Nova,
			fi: CollectionTranslationInput_Nova,
			fr: CollectionTranslationInput_Nova,
			de: CollectionTranslationInput_Nova,
			el: CollectionTranslationInput_Nova,
			hi: CollectionTranslationInput_Nova,
			hu: CollectionTranslationInput_Nova,
			id: CollectionTranslationInput_Nova,
			it: CollectionTranslationInput_Nova,
			ja: CollectionTranslationInput_Nova,
			ko: CollectionTranslationInput_Nova,
			lv: CollectionTranslationInput_Nova,
			lt: CollectionTranslationInput_Nova,
			ms: CollectionTranslationInput_Nova,
			mn: CollectionTranslationInput_Nova,
			nb: CollectionTranslationInput_Nova,
			pl: CollectionTranslationInput_Nova,
			pt: CollectionTranslationInput_Nova,
			ro: CollectionTranslationInput_Nova,
			ru: CollectionTranslationInput_Nova,
			sr: CollectionTranslationInput_Nova,
			'zh-CN': CollectionTranslationInput_Nova,
			sk: CollectionTranslationInput_Nova,
			sl: CollectionTranslationInput_Nova,
			es: CollectionTranslationInput_Nova,
			sw: CollectionTranslationInput_Nova,
			sv: CollectionTranslationInput_Nova,
			th: CollectionTranslationInput_Nova,
			'zh-TW': CollectionTranslationInput_Nova,
			tr: CollectionTranslationInput_Nova,
			uk: CollectionTranslationInput_Nova,
			vi: CollectionTranslationInput_Nova,
		})
		.partial()
		.passthrough()
		.optional(),
});
const UpdateCollectionBody_Nova = z
	.object({
		name: z.string().max(255),
		description: z.string().max(512),
		icon: CollectionIcon_Nova,
		parentId: z.union([z.string(), z.null()]),
		translations: z
			.object({
				bn: CollectionTranslationInput_Nova,
				bs: CollectionTranslationInput_Nova,
				'pt-BR': CollectionTranslationInput_Nova,
				bg: CollectionTranslationInput_Nova,
				ca: CollectionTranslationInput_Nova,
				hr: CollectionTranslationInput_Nova,
				cs: CollectionTranslationInput_Nova,
				da: CollectionTranslationInput_Nova,
				nl: CollectionTranslationInput_Nova,
				en: CollectionTranslationInput_Nova,
				et: CollectionTranslationInput_Nova,
				fi: CollectionTranslationInput_Nova,
				fr: CollectionTranslationInput_Nova,
				de: CollectionTranslationInput_Nova,
				el: CollectionTranslationInput_Nova,
				hi: CollectionTranslationInput_Nova,
				hu: CollectionTranslationInput_Nova,
				id: CollectionTranslationInput_Nova,
				it: CollectionTranslationInput_Nova,
				ja: CollectionTranslationInput_Nova,
				ko: CollectionTranslationInput_Nova,
				lv: CollectionTranslationInput_Nova,
				lt: CollectionTranslationInput_Nova,
				ms: CollectionTranslationInput_Nova,
				mn: CollectionTranslationInput_Nova,
				nb: CollectionTranslationInput_Nova,
				pl: CollectionTranslationInput_Nova,
				pt: CollectionTranslationInput_Nova,
				ro: CollectionTranslationInput_Nova,
				ru: CollectionTranslationInput_Nova,
				sr: CollectionTranslationInput_Nova,
				'zh-CN': CollectionTranslationInput_Nova,
				sk: CollectionTranslationInput_Nova,
				sl: CollectionTranslationInput_Nova,
				es: CollectionTranslationInput_Nova,
				sw: CollectionTranslationInput_Nova,
				sv: CollectionTranslationInput_Nova,
				th: CollectionTranslationInput_Nova,
				'zh-TW': CollectionTranslationInput_Nova,
				tr: CollectionTranslationInput_Nova,
				uk: CollectionTranslationInput_Nova,
				vi: CollectionTranslationInput_Nova,
			})
			.partial()
			.passthrough(),
	})
	.partial();
const DeletedCollection = z.object({ id: z.string(), object: z.literal('collection'), deleted: z.literal(true) }).passthrough();
const ArticleIcon = z.union([z.object({ type: z.enum(['emoji', 'custom']), value: z.string() }).passthrough(), z.null()]);
const ArticleAuthor = z.object({ name: z.string(), authorId: z.string(), avatarUrl: z.union([z.string(), z.null()]).optional() }).passthrough();
const ArticleTranslation = z
	.object({
		title: z.string(),
		description: z.string(),
		body: z.string(),
		slug: z.string(),
		featurebaseUrl: z.string(),
		externalUrl: z.string(),
		author: ArticleAuthor.and(z.unknown()),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.partial()
	.passthrough();
const Article = z
	.object({
		object: z.literal('article'),
		id: z.string(),
		title: z.string().optional(),
		description: z.string().optional(),
		body: z.string().optional(),
		slug: z.string().optional(),
		icon: ArticleIcon.optional(),
		parentId: z.union([z.string(), z.null()]).optional(),
		helpCenterId: z.string(),
		organization: z.string(),
		state: z.enum(['live', 'draft']),
		defaultLocale: z
			.enum([
				'bn',
				'bs',
				'pt-BR',
				'bg',
				'ca',
				'hr',
				'cs',
				'da',
				'nl',
				'en',
				'et',
				'fi',
				'fr',
				'de',
				'el',
				'hi',
				'hu',
				'id',
				'it',
				'ja',
				'ko',
				'lv',
				'lt',
				'ms',
				'mn',
				'nb',
				'pl',
				'pt',
				'ro',
				'ru',
				'sr',
				'zh-CN',
				'sk',
				'sl',
				'es',
				'sw',
				'sv',
				'th',
				'zh-TW',
				'tr',
				'uk',
				'vi',
			])
			.optional(),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		availableLocales: z.array(
			z.enum([
				'bn',
				'bs',
				'pt-BR',
				'bg',
				'ca',
				'hr',
				'cs',
				'da',
				'nl',
				'en',
				'et',
				'fi',
				'fr',
				'de',
				'el',
				'hi',
				'hu',
				'id',
				'it',
				'ja',
				'ko',
				'lv',
				'lt',
				'ms',
				'mn',
				'nb',
				'pl',
				'pt',
				'ro',
				'ru',
				'sr',
				'zh-CN',
				'sk',
				'sl',
				'es',
				'sw',
				'sv',
				'th',
				'zh-TW',
				'tr',
				'uk',
				'vi',
			]),
		),
		publishedLocales: z
			.array(
				z.enum([
					'bn',
					'bs',
					'pt-BR',
					'bg',
					'ca',
					'hr',
					'cs',
					'da',
					'nl',
					'en',
					'et',
					'fi',
					'fr',
					'de',
					'el',
					'hi',
					'hu',
					'id',
					'it',
					'ja',
					'ko',
					'lv',
					'lt',
					'ms',
					'mn',
					'nb',
					'pl',
					'pt',
					'ro',
					'ru',
					'sr',
					'zh-CN',
					'sk',
					'sl',
					'es',
					'sw',
					'sv',
					'th',
					'zh-TW',
					'tr',
					'uk',
					'vi',
				]),
			)
			.optional(),
		featurebaseUrl: z.string().optional(),
		externalUrl: z.string().optional(),
		author: ArticleAuthor.optional(),
		order: z.union([z.number(), z.null()]).optional(),
		isPublished: z.boolean().optional(),
		isDraftDiffersFromLive: z.boolean().optional(),
		translations: z
			.object({
				bn: ArticleTranslation,
				bs: ArticleTranslation,
				'pt-BR': ArticleTranslation,
				bg: ArticleTranslation,
				ca: ArticleTranslation,
				hr: ArticleTranslation,
				cs: ArticleTranslation,
				da: ArticleTranslation,
				nl: ArticleTranslation,
				en: ArticleTranslation,
				et: ArticleTranslation,
				fi: ArticleTranslation,
				fr: ArticleTranslation,
				de: ArticleTranslation,
				el: ArticleTranslation,
				hi: ArticleTranslation,
				hu: ArticleTranslation,
				id: ArticleTranslation,
				it: ArticleTranslation,
				ja: ArticleTranslation,
				ko: ArticleTranslation,
				lv: ArticleTranslation,
				lt: ArticleTranslation,
				ms: ArticleTranslation,
				mn: ArticleTranslation,
				nb: ArticleTranslation,
				pl: ArticleTranslation,
				pt: ArticleTranslation,
				ro: ArticleTranslation,
				ru: ArticleTranslation,
				sr: ArticleTranslation,
				'zh-CN': ArticleTranslation,
				sk: ArticleTranslation,
				sl: ArticleTranslation,
				es: ArticleTranslation,
				sw: ArticleTranslation,
				sv: ArticleTranslation,
				th: ArticleTranslation,
				'zh-TW': ArticleTranslation,
				tr: ArticleTranslation,
				uk: ArticleTranslation,
				vi: ArticleTranslation,
			})
			.partial()
			.passthrough()
			.optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
		liveUpdatedAt: z.string().optional(),
		path: z.string().optional(),
		surveyId: z.string().optional(),
		visibleBy: z.array(z.string()).optional(),
		translationCreatedAt: z.string().optional(),
		translationUpdatedAt: z.string().optional(),
	})
	.passthrough();
const ArticleList = z.object({ object: z.literal('list'), data: z.array(Article), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const ArticleIconInput_Nova = z.union([z.object({ value: z.string().max(255), type: z.enum(['emoji', 'predefined']) }).passthrough(), z.null()]);
const ArticleTranslationInput_Nova = z
	.object({ title: z.string().max(512), description: z.string().max(512), body: z.string() })
	.partial()
	.passthrough();
const CreateArticleBody_Nova = z.object({
	title: z.string().max(512),
	description: z.string().max(512).optional(),
	body: z.string().optional(),
	formatter: z.enum(['default', 'ai']).optional().default('default'),
	parentId: z
		.string()
		.min(1)
		.max(16)
		.regex(/^[a-zA-Z0-9]+$/)
		.optional(),
	icon: ArticleIconInput_Nova.optional(),
	state: z.enum(['live', 'draft']).optional().default('draft'),
	translations: z
		.object({
			bn: ArticleTranslationInput_Nova,
			bs: ArticleTranslationInput_Nova,
			'pt-BR': ArticleTranslationInput_Nova,
			bg: ArticleTranslationInput_Nova,
			ca: ArticleTranslationInput_Nova,
			hr: ArticleTranslationInput_Nova,
			cs: ArticleTranslationInput_Nova,
			da: ArticleTranslationInput_Nova,
			nl: ArticleTranslationInput_Nova,
			en: ArticleTranslationInput_Nova,
			et: ArticleTranslationInput_Nova,
			fi: ArticleTranslationInput_Nova,
			fr: ArticleTranslationInput_Nova,
			de: ArticleTranslationInput_Nova,
			el: ArticleTranslationInput_Nova,
			hi: ArticleTranslationInput_Nova,
			hu: ArticleTranslationInput_Nova,
			id: ArticleTranslationInput_Nova,
			it: ArticleTranslationInput_Nova,
			ja: ArticleTranslationInput_Nova,
			ko: ArticleTranslationInput_Nova,
			lv: ArticleTranslationInput_Nova,
			lt: ArticleTranslationInput_Nova,
			ms: ArticleTranslationInput_Nova,
			mn: ArticleTranslationInput_Nova,
			nb: ArticleTranslationInput_Nova,
			pl: ArticleTranslationInput_Nova,
			pt: ArticleTranslationInput_Nova,
			ro: ArticleTranslationInput_Nova,
			ru: ArticleTranslationInput_Nova,
			sr: ArticleTranslationInput_Nova,
			'zh-CN': ArticleTranslationInput_Nova,
			sk: ArticleTranslationInput_Nova,
			sl: ArticleTranslationInput_Nova,
			es: ArticleTranslationInput_Nova,
			sw: ArticleTranslationInput_Nova,
			sv: ArticleTranslationInput_Nova,
			th: ArticleTranslationInput_Nova,
			'zh-TW': ArticleTranslationInput_Nova,
			tr: ArticleTranslationInput_Nova,
			uk: ArticleTranslationInput_Nova,
			vi: ArticleTranslationInput_Nova,
		})
		.partial()
		.passthrough()
		.optional(),
});
const UpdateArticleBody_Nova = z
	.object({
		title: z.string().max(512),
		description: z.string().max(512),
		body: z.string(),
		formatter: z.enum(['default', 'ai']).default('default'),
		icon: ArticleIconInput_Nova.and(z.unknown()),
		parentId: z.union([z.string(), z.null()]),
		authorId: z.string(),
		state: z.enum(['live', 'draft']),
		translations: z
			.object({
				bn: ArticleTranslationInput_Nova,
				bs: ArticleTranslationInput_Nova,
				'pt-BR': ArticleTranslationInput_Nova,
				bg: ArticleTranslationInput_Nova,
				ca: ArticleTranslationInput_Nova,
				hr: ArticleTranslationInput_Nova,
				cs: ArticleTranslationInput_Nova,
				da: ArticleTranslationInput_Nova,
				nl: ArticleTranslationInput_Nova,
				en: ArticleTranslationInput_Nova,
				et: ArticleTranslationInput_Nova,
				fi: ArticleTranslationInput_Nova,
				fr: ArticleTranslationInput_Nova,
				de: ArticleTranslationInput_Nova,
				el: ArticleTranslationInput_Nova,
				hi: ArticleTranslationInput_Nova,
				hu: ArticleTranslationInput_Nova,
				id: ArticleTranslationInput_Nova,
				it: ArticleTranslationInput_Nova,
				ja: ArticleTranslationInput_Nova,
				ko: ArticleTranslationInput_Nova,
				lv: ArticleTranslationInput_Nova,
				lt: ArticleTranslationInput_Nova,
				ms: ArticleTranslationInput_Nova,
				mn: ArticleTranslationInput_Nova,
				nb: ArticleTranslationInput_Nova,
				pl: ArticleTranslationInput_Nova,
				pt: ArticleTranslationInput_Nova,
				ro: ArticleTranslationInput_Nova,
				ru: ArticleTranslationInput_Nova,
				sr: ArticleTranslationInput_Nova,
				'zh-CN': ArticleTranslationInput_Nova,
				sk: ArticleTranslationInput_Nova,
				sl: ArticleTranslationInput_Nova,
				es: ArticleTranslationInput_Nova,
				sw: ArticleTranslationInput_Nova,
				sv: ArticleTranslationInput_Nova,
				th: ArticleTranslationInput_Nova,
				'zh-TW': ArticleTranslationInput_Nova,
				tr: ArticleTranslationInput_Nova,
				uk: ArticleTranslationInput_Nova,
				vi: ArticleTranslationInput_Nova,
			})
			.partial()
			.passthrough(),
	})
	.partial();
const DeletedArticle = z.object({ id: z.string(), object: z.literal('article'), deleted: z.literal(true) }).passthrough();
const RedirectRule = z
	.object({
		object: z.literal('redirect_rule'),
		id: z.string(),
		helpCenterId: z.string(),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		fromUrl: z.string(),
		targetType: z.enum(['article', 'collection']),
		targetId: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const RedirectRuleList = z.object({ object: z.literal('list'), data: z.array(RedirectRule), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const CreateRedirectRuleBody_Nova = z.object({
	helpCenterId: z
		.string()
		.min(1)
		.max(16)
		.regex(/^[a-zA-Z0-9]+$/),
	locale: z.enum([
		'bn',
		'bs',
		'pt-BR',
		'bg',
		'ca',
		'hr',
		'cs',
		'da',
		'nl',
		'en',
		'et',
		'fi',
		'fr',
		'de',
		'el',
		'hi',
		'hu',
		'id',
		'it',
		'ja',
		'ko',
		'lv',
		'lt',
		'ms',
		'mn',
		'nb',
		'pl',
		'pt',
		'ro',
		'ru',
		'sr',
		'zh-CN',
		'sk',
		'sl',
		'es',
		'sw',
		'sv',
		'th',
		'zh-TW',
		'tr',
		'uk',
		'vi',
	]),
	fromUrl: z.string().max(2048),
	targetType: z.enum(['article', 'collection']),
	targetId: z
		.string()
		.min(1)
		.max(16)
		.regex(/^[a-zA-Z0-9]+$/),
});
const UpdateRedirectRuleBody_Nova = z
	.object({
		helpCenterId: z
			.string()
			.min(1)
			.max(16)
			.regex(/^[a-zA-Z0-9]+$/),
		locale: z.enum([
			'bn',
			'bs',
			'pt-BR',
			'bg',
			'ca',
			'hr',
			'cs',
			'da',
			'nl',
			'en',
			'et',
			'fi',
			'fr',
			'de',
			'el',
			'hi',
			'hu',
			'id',
			'it',
			'ja',
			'ko',
			'lv',
			'lt',
			'ms',
			'mn',
			'nb',
			'pl',
			'pt',
			'ro',
			'ru',
			'sr',
			'zh-CN',
			'sk',
			'sl',
			'es',
			'sw',
			'sv',
			'th',
			'zh-TW',
			'tr',
			'uk',
			'vi',
		]),
		fromUrl: z.string().max(2048),
		targetType: z.enum(['article', 'collection']),
		targetId: z
			.string()
			.min(1)
			.max(16)
			.regex(/^[a-zA-Z0-9]+$/),
	})
	.partial();
const DeletedRedirectRule = z.object({ id: z.string(), object: z.literal('redirect_rule'), deleted: z.literal(true) }).passthrough();
const ContactList = z
	.object({ object: z.literal('list'), data: z.array(Contact.and(z.object({}).partial().passthrough())), nextCursor: z.union([z.string(), z.null()]) })
	.passthrough();
const UpsertContactCompany = z.object({
	id: z.string().min(1).max(500),
	name: z.string().min(1).max(500),
	createdAt: z.union([z.string(), z.null()]).optional(),
	monthlySpend: z.number().gte(0).optional(),
	customFields: z.object({ plan: z.string(), industry: z.string(), priority: z.string() }).partial().passthrough().optional(),
	companyHash: z.string().max(256).optional(),
	companySize: z.union([z.number(), z.null()]).optional(),
	industry: z.string().max(500).optional(),
	website: z.string().max(500).optional(),
	plan: z.string().max(500).optional(),
});
const UpsertContactBody = z
	.object({
		email: z.string().max(500).email(),
		name: z.string().max(500),
		userId: z.string().max(500),
		userHash: z.string().max(256),
		profilePicture: z.union([z.string(), z.null()]),
		companies: z.array(UpsertContactCompany).max(100),
		createdAt: z.union([z.string(), z.null()]),
		customFields: z.object({ plan: z.string(), signupSource: z.string(), accountType: z.string() }).partial().passthrough(),
		subscribedToChangelog: z.boolean(),
		locale: z.string().max(10),
		phone: z.union([z.string(), z.null()]),
		roles: z.array(z.string().max(255)).max(100),
	})
	.partial();
const DeletedContact = z.object({ id: z.string(), object: z.literal('contact'), deleted: z.literal(true) }).passthrough();
const ContactEmailPreferenceState = z
	.object({ status: z.enum(['subscribed', 'unsubscribed']), effectiveStatus: z.enum(['subscribed', 'unsubscribed']) })
	.passthrough();
const ContactEmailPreferences = z
	.object({
		all: ContactEmailPreferenceState,
		postUpdates: ContactEmailPreferenceState.and(z.unknown()),
		postComments: ContactEmailPreferenceState.and(z.unknown()),
		commentReplies: ContactEmailPreferenceState.and(z.unknown()),
		changelog: ContactEmailPreferenceState.and(z.unknown()),
	})
	.passthrough();
const ContactEmailPreferencesOutput = z
	.object({
		object: z.literal('contact_email_preferences'),
		contactId: z.string(),
		userId: z.union([z.string(), z.null()]).optional(),
		email: z.union([z.string(), z.null()]).optional(),
		preferences: ContactEmailPreferences,
	})
	.passthrough();
const UpdateContactEmailPreferenceBody = z.object({
	preferences: z
		.object({
			all: z.enum(['subscribed', 'unsubscribed']),
			postUpdates: z.enum(['subscribed', 'unsubscribed']),
			postComments: z.enum(['subscribed', 'unsubscribed']),
			commentReplies: z.enum(['subscribed', 'unsubscribed']),
			changelog: z.enum(['subscribed', 'unsubscribed']),
		})
		.partial(),
});
const BlockedContact = z.object({ id: z.string(), object: z.literal('contact'), blocked: z.literal(true) }).passthrough();
const UnblockedContact = z.object({ id: z.string(), object: z.literal('contact'), unblocked: z.literal(true) }).passthrough();
const Icon = z.union([z.object({ value: z.string(), type: z.enum(['emoji', 'predefined', 'external']) }).passthrough(), z.null()]);
const Team = z
	.object({ object: z.literal('team'), id: z.string(), name: z.string(), color: z.string(), icon: Icon, members: z.array(z.string()) })
	.passthrough();
const TeamList = z.object({ object: z.literal('list'), data: z.array(Team) }).passthrough();
const CompanyList = z.object({ object: z.literal('list'), data: z.array(Company), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const UpsertCompanyBody = z.object({
	companyId: z.string().min(1).max(500),
	name: z.string().min(1).max(500),
	monthlySpend: z.number().gte(0).optional(),
	industry: z.string().max(500).optional(),
	website: z.string().max(500).optional(),
	plan: z.string().max(500).optional(),
	companySize: z.union([z.number(), z.null()]).optional(),
	createdAt: z.union([z.string(), z.null()]).optional(),
	customFields: z.object({ region: z.string(), tier: z.string(), priority: z.string() }).partial().passthrough().optional(),
});
const DeletedCompany = z.object({ id: z.string(), object: z.literal('company'), deleted: z.literal(true) }).passthrough();
const AttachContactToCompanyBody = z.object({ contactId: z.string() }).passthrough();
const Brand = z
	.object({
		object: z.literal('brand'),
		id: z.string(),
		name: z.string(),
		isDefault: z.boolean(),
		createdAt: z.union([z.string(), z.null()]),
		updatedAt: z.union([z.string(), z.null()]),
		helpCenterId: z.union([z.string(), z.null()]),
		senderEmailAddressId: z.union([z.string(), z.null()]),
	})
	.passthrough();
const BrandList = z.object({ object: z.literal('list'), data: z.array(Brand), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const ConversationParticipant = z.object({ type: z.enum(['customer', 'lead', 'admin', 'bot', 'guest', 'integration']), id: z.string() }).passthrough();
const MessageSource = z
	.object({
		channel: z.enum(['unknown', 'desktop', 'android', 'ios', 'email']),
		deliveredAs: z.enum(['customer_initiated', 'admin_initiated']).optional(),
		subject: z.string().optional(),
		bodyHtml: z.string(),
		bodyMarkdown: z.string(),
		author: ConversationParticipant.optional(),
		url: z.string().optional(),
	})
	.passthrough();
const ConversationTag = z.object({ type: z.literal('tag'), id: z.string(), name: z.string() }).passthrough();
const ReadReceipt = z.object({ id: z.string(), userType: z.enum(['admin', 'customer', 'lead']), lastReadPartId: z.string() }).passthrough();
const CsatRatedAgent = z.object({ type: z.enum(['teammate', 'fibi', 'chatbot']), id: z.string().optional() }).passthrough();
const CsatWorkflowLink = z
	.object({ workflowId: z.string(), workflowRunId: z.string(), workflowStepId: z.string(), workflowActionId: z.string() })
	.partial()
	.passthrough();
const ConversationCsatSummary = z
	.object({
		requestId: z.string().optional(),
		status: z.enum(['pending', 'rated', 'canceled', 'expired']),
		channel: z.enum(['desktop', 'email']).optional(),
		requestSource: z.literal('workflow').optional(),
		requestedAt: z.string().optional(),
		ratedAt: z.string().optional(),
		canceledAt: z.string().optional(),
		expiredAt: z.string().optional(),
		lastUpdatedAt: z.string(),
		score: z.number().gte(1).lte(5).optional(),
		remark: z.string().optional(),
		ratedAgent: CsatRatedAgent.optional(),
		workflow: CsatWorkflowLink.optional(),
	})
	.passthrough();
const CsatEmailDelivery = z
	.object({
		status: z.enum(['pending', 'sent', 'failed']),
		messageId: z.string().optional(),
		sentAt: z.string().optional(),
		failedAt: z.string().optional(),
		failureReason: z.string().optional(),
	})
	.passthrough();
const ConversationCsatHistoryEntry = z
	.object({
		requestId: z.string(),
		status: z.enum(['pending', 'rated', 'canceled', 'expired']),
		channel: z.enum(['desktop', 'email']),
		requestSource: z.literal('workflow'),
		requestedAt: z.string(),
		ratedAt: z.string().optional(),
		canceledAt: z.string().optional(),
		expiredAt: z.string().optional(),
		lastUpdatedAt: z.string(),
		score: z.number().gte(1).lte(5).optional(),
		remark: z.string().optional(),
		ratedAgent: CsatRatedAgent.optional(),
		workflow: CsatWorkflowLink.optional(),
		lateSubmitWindowEndsAt: z.string().optional(),
		changeLockWindowEndsAt: z.string().optional(),
		emailDelivery: CsatEmailDelivery.optional(),
		isLatestEffective: z.boolean(),
	})
	.passthrough();
const ConversationCsatDebug = z
	.object({
		requestId: z.string(),
		status: z.enum(['pending', 'rated', 'canceled', 'expired']),
		lateSubmitWindowEndsAt: z.string().optional(),
		changeLockWindowEndsAt: z.string().optional(),
		emailDelivery: CsatEmailDelivery.optional(),
	})
	.passthrough();
const ConversationPartAuthor = z.union([
	z
		.object({
			type: z.enum(['customer', 'lead', 'admin', 'bot', 'guest', 'integration']),
			id: z.union([z.string(), z.null()]),
			name: z.string().optional(),
			email: z.string().optional(),
			profilePicture: z.union([z.string(), z.null()]).optional(),
		})
		.passthrough(),
	z.null(),
]);
const ConversationTagMutationActor = z
	.object({
		type: z.enum(['admin', 'customer', 'lead', 'bot', 'integration', 'system', 'workflow']),
		id: z.union([z.string(), z.null()]).optional(),
		name: z.union([z.string(), z.null()]).optional(),
	})
	.passthrough();
const ConversationTagApplication = z
	.object({
		tagId: z.string(),
		tag: ConversationTag.and(z.unknown()).optional(),
		appliedAt: z.string(),
		appliedBy: ConversationTagMutationActor.optional(),
		removedAt: z.union([z.string(), z.null()]).optional(),
		removedBy: ConversationTagMutationActor.and(z.unknown()).optional(),
	})
	.passthrough();
const UserMessagePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('user_msg'),
		bodyHtml: z.union([z.string(), z.null()]),
		bodyMarkdown: z.union([z.string(), z.null()]),
		channel: z.enum(['unknown', 'desktop', 'android', 'ios', 'email']),
	})
	.passthrough();
const AdminMessagePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('admin_msg'),
		bodyHtml: z.union([z.string(), z.null()]),
		bodyMarkdown: z.union([z.string(), z.null()]),
		channel: z.enum(['unknown', 'desktop', 'android', 'ios', 'email']),
	})
	.passthrough();
const AdminNotePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('admin_note'),
		bodyHtml: z.union([z.string(), z.null()]),
		bodyMarkdown: z.union([z.string(), z.null()]),
	})
	.passthrough();
const EmailMessagePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('email_msg'),
		bodyHtml: z.union([z.string(), z.null()]),
		bodyMarkdown: z.union([z.string(), z.null()]),
		channel: z.literal('email'),
	})
	.passthrough();
const BotMessagePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('bot_msg'),
		bodyHtml: z.union([z.string(), z.null()]),
		bodyMarkdown: z.union([z.string(), z.null()]),
		channel: z.enum(['unknown', 'desktop', 'android', 'ios', 'email']).optional(),
	})
	.passthrough();
const QuickReplyOptionsPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('quick_reply_opts'),
		replyOptions: z.array(z.object({ id: z.string(), text: z.string() }).passthrough()),
	})
	.passthrough();
const QuickReplyResponsePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('quick_reply_resp'),
		bodyHtml: z.string(),
		bodyMarkdown: z.string(),
		selectedOptionId: z.string(),
	})
	.passthrough();
const RatingRequestedCsatPayload = z
	.object({
		requestId: z.string(),
		status: z.enum(['pending', 'rated', 'canceled', 'expired']),
		channel: z.enum(['desktop', 'email']),
		requestSource: z.literal('workflow'),
		requestedAt: z.string(),
		expiredAt: z.string().optional(),
		lateSubmitWindowEndsAt: z.string().optional(),
		changeLockWindowEndsAt: z.string().optional(),
		ratedAgent: CsatRatedAgent.optional(),
		workflow: CsatWorkflowLink.optional(),
	})
	.passthrough();
const RatingRequestedPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('rating_requested'),
		csat: RatingRequestedCsatPayload,
	})
	.passthrough();
const RatingSubmittedCsatPayload = z
	.object({
		requestId: z.string(),
		status: z.literal('rated'),
		channel: z.enum(['desktop', 'email']),
		requestSource: z.literal('workflow'),
		requestedAt: z.string().optional(),
		ratedAt: z.string(),
		score: z.number().gte(1).lte(5),
		remark: z.string().optional(),
		ratedAgent: CsatRatedAgent.optional(),
		workflow: CsatWorkflowLink.optional(),
	})
	.passthrough();
const RatingSubmittedPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('rating_submitted'),
		csat: RatingSubmittedCsatPayload,
	})
	.passthrough();
const AttributeCollectionPromptPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		author: ConversationPartAuthor.optional(),
		redacted: z.boolean().optional(),
		tagApplications: z.array(ConversationTagApplication).optional(),
		partType: z.literal('attr_prompt'),
		form: z
			.object({ id: z.string(), attributes: z.array(z.object({ identifier: z.string(), name: z.string(), type: z.string() }).passthrough()) })
			.passthrough(),
	})
	.passthrough();
const AttributeCollectionCompletePart = z
	.object({ object: z.literal('conversation_part'), id: z.string(), createdAt: z.string(), updatedAt: z.string(), partType: z.literal('attr_complete') })
	.passthrough();
const AssignmentPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('assign'),
		adminAssigneeId: z.union([z.string(), z.null()]).optional(),
		adminAssignerId: z.union([z.string(), z.null()]).optional(),
		teamAssigneeId: z.union([z.string(), z.null()]).optional(),
	})
	.passthrough();
const StatusChangePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('status'),
		status: z.enum(['open', 'closed', 'snoozed']),
		snoozedUntil: z.union([z.string(), z.null()]).optional(),
	})
	.passthrough();
const TagUpdatePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('tags'),
		action: z.enum(['added', 'removed']),
		tagId: z.string(),
		tagName: z.union([z.string(), z.null()]).optional(),
		targetPartId: z.union([z.string(), z.null()]).optional(),
		actor: ConversationTagMutationActor.and(z.unknown()).optional(),
		occurredAt: z.string(),
	})
	.passthrough();
const WorkflowWaitEventPayload = z
	.object({
		eventType: z.enum(['started', 'finished', 'interrupted']),
		workflowId: z.string().optional(),
		workflowName: z.string().optional(),
		waitLabel: z.string().optional(),
		interruptedByUserType: z.enum(['admin', 'customer', 'lead']).optional(),
		occurredAt: z.string(),
	})
	.passthrough();
const WorkflowWaitPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('workflow_wait'),
		workflowWait: WorkflowWaitEventPayload,
	})
	.passthrough();
const PriorityChangePart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('priority'),
		isPriority: z.boolean(),
	})
	.passthrough();
const ParticipantAddedPart = z
	.object({
		object: z.literal('conversation_part'),
		id: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
		partType: z.literal('part_add'),
		participant: z.object({ id: z.string(), type: z.enum(['customer', 'lead', 'admin']) }).passthrough(),
	})
	.passthrough();
const ConversationPart = z.discriminatedUnion('partType', [
	UserMessagePart,
	AdminMessagePart,
	AdminNotePart,
	EmailMessagePart,
	BotMessagePart,
	QuickReplyOptionsPart,
	QuickReplyResponsePart,
	RatingRequestedPart,
	RatingSubmittedPart,
	AttributeCollectionPromptPart,
	AttributeCollectionCompletePart,
	AssignmentPart,
	StatusChangePart,
	TagUpdatePart,
	WorkflowWaitPart,
	PriorityChangePart,
	ParticipantAddedPart,
]);
const Conversation = z
	.object({
		object: z.literal('conversation'),
		id: z.string(),
		brandId: z.union([z.string(), z.null()]),
		title: z.string().optional(),
		state: z.enum(['open', 'closed', 'snoozed']),
		isBlocked: z.boolean(),
		priority: z.boolean(),
		prioritySetAt: z.union([z.string(), z.null()]),
		adminAssigneeId: z.union([z.string(), z.null()]),
		teamAssigneeId: z.union([z.string(), z.null()]),
		userPreferredLanguage: z.string(),
		hasAdminOverriddenLanguage: z.boolean(),
		source: MessageSource.optional(),
		participants: z.array(ConversationParticipant),
		tags: z.array(ConversationTag),
		botConversationState: z.enum(['active', 'handed_off_to_human', 'resolved']).optional(),
		botConversationStateLastUpdatedAt: z.union([z.string(), z.null()]),
		disableCustomerReply: z.boolean().optional(),
		awaitingCustomerReply: z.boolean().optional(),
		lastActivityAt: z.union([z.string(), z.null()]),
		waitingSince: z.union([z.string(), z.null()]),
		snoozedUntil: z.union([z.string(), z.null()]),
		createdAt: z.string(),
		updatedAt: z.string(),
		readReceipts: z.array(ReadReceipt).optional(),
		csatSummary: ConversationCsatSummary.optional(),
		csatHistory: z.array(ConversationCsatHistoryEntry).optional(),
		csatDebug: ConversationCsatDebug.optional(),
		conversationParts: z.array(ConversationPart).optional(),
	})
	.passthrough();
const ConversationList = z.object({ object: z.literal('list'), data: z.array(Conversation), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const ConversationFromContact = z.object({ type: z.literal('contact'), id: z.string() }).passthrough();
const ConversationFromAdmin = z.object({ type: z.literal('admin'), id: z.string() }).passthrough();
const ConversationFrom = z.union([ConversationFromContact, ConversationFromAdmin]);
const EmailRecipients = z
	.object({ emails: z.array(z.string().email()).max(50), ids: z.array(z.string()).max(50) })
	.partial()
	.passthrough();
const OutreachRecipients = z
	.object({ to: EmailRecipients, cc: EmailRecipients.and(z.unknown()).optional(), bcc: EmailRecipients.and(z.unknown()).optional() })
	.passthrough();
const CreateConversationBody = z
	.object({
		from: ConversationFrom,
		bodyMarkdown: z.string().min(1),
		channel: z.enum(['desktop', 'email']).optional().default('desktop'),
		recipients: OutreachRecipients.optional(),
		subject: z.string().max(500).optional(),
		createdAt: z.union([z.string(), z.null()]).optional(),
	})
	.passthrough();
const DeletedConversation = z.object({ id: z.string(), object: z.literal('conversation'), deleted: z.literal(true) }).passthrough();
const MarkAsRead = z
	.object({
		allAdmins: z.union([z.boolean(), z.null()]),
		adminIds: z.array(z.string()).max(255),
		allContacts: z.union([z.boolean(), z.null()]),
		contactIds: z.array(z.string()).max(255),
	})
	.partial()
	.passthrough();
const UpdateConversationBody = z
	.object({
		actingAdminId: z.string(),
		state: z.enum(['open', 'closed', 'snoozed']),
		snoozedUntil: z.union([z.string(), z.null()]),
		adminAssigneeId: z.union([z.string(), z.null()]),
		teamAssigneeId: z.union([z.string(), z.null()]),
		title: z.string().max(255),
		customAttributes: z.object({}).partial().passthrough(),
		markAsRead: MarkAsRead,
	})
	.partial()
	.passthrough();
const AttachConversationTagBody = z.object({ tagId: z.string(), actingAdminId: z.string() }).passthrough();
const AttachedConversationTag = z
	.object({
		type: z.literal('tag'),
		id: z.string(),
		name: z.string(),
		targetPartId: z.union([z.string(), z.null()]).optional(),
		appliedAt: z.union([z.string(), z.null()]).optional(),
		appliedBy: z.union([ConversationTagMutationActor, z.null(), z.null()]).optional(),
		removedAt: z.union([z.string(), z.null()]).optional(),
		removedBy: z.union([ConversationTagMutationActor, z.null(), z.null()]).optional(),
	})
	.passthrough();
const DetachConversationTagBody = z.object({ actingAdminId: z.string() }).passthrough();
const ContactReplyBody = z
	.object({
		type: z.literal('contact'),
		userId: z.string().max(255).optional(),
		id: z.string().optional(),
		bodyMarkdown: z.string().min(1),
		messageType: z.literal('reply'),
		skipNotifications: z.boolean().optional().default(false),
	})
	.passthrough();
const AdminReplyBody = z
	.object({
		type: z.literal('admin'),
		id: z.string(),
		bodyMarkdown: z.string().min(1),
		messageType: z.enum(['reply', 'note']),
		skipNotifications: z.boolean().optional().default(false),
	})
	.passthrough();
const ReplyToConversationBody = z.union([ContactReplyBody, AdminReplyBody]);
const ParticipantIdentifier = z
	.object({ id: z.string(), userId: z.string().max(255), email: z.string().email() })
	.partial()
	.passthrough();
const AddParticipantBody = z.object({ participant: ParticipantIdentifier, actingAdminId: z.string().optional() }).passthrough();
const RemoveParticipantBody = z.object({ id: z.string(), actingAdminId: z.string().optional() }).passthrough();
const RedactConversationPartBody = z
	.object({
		type: z.literal('conversation_part'),
		conversationId: z
			.string()
			.min(1)
			.max(16)
			.regex(/^[a-zA-Z0-9]+$/),
		conversationPartId: z
			.string()
			.min(1)
			.max(16)
			.regex(/^[a-zA-Z0-9]+$/),
		actingAdminId: z.string().optional(),
	})
	.passthrough();
const TagList = z.object({ object: z.literal('list'), data: z.array(ConversationTag), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const UpsertTagBody = z.object({ id: z.string().optional(), name: z.string().min(1).max(255), actingAdminId: z.string().optional() }).passthrough();
const DeleteTagBody = z.object({ actingAdminId: z.string() }).partial().passthrough();
const DeletedTag = z.object({ object: z.literal('tag'), id: z.string(), deleted: z.literal(true) }).passthrough();
const TicketAuthor = z.union([
	z
		.object({
			id: z.union([z.string(), z.null()]),
			name: z.string(),
			email: z.union([z.string(), z.null()]),
			profilePicture: z.union([z.string(), z.null()]),
			type: z.enum(['admin', 'customer', 'guest', 'integration', 'bot', 'lead']),
		})
		.passthrough(),
	z.null(),
]);
const LinkedConversation = z.object({ id: z.string(), role: z.enum(['customer', 'tracker', 'back-office']) }).passthrough();
const Ticket = z
	.object({
		object: z.literal('ticket'),
		id: z.string(),
		ticketNumber: z.number(),
		title: z.string(),
		content: z.string(),
		ticketCategoryId: z.string(),
		categoryType: z.enum(['customer', 'tracker', 'back-office']),
		ticketUrl: z.string(),
		author: TicketAuthor,
		status: PostStatus.and(z.unknown()),
		customFields: z.object({}).partial().passthrough(),
		companyId: z.union([z.string(), z.null()]),
		assigneeId: z.union([z.string(), z.null()]),
		teamAssigneeId: z.union([z.string(), z.null()]),
		open: z.boolean(),
		snoozedUntil: z.union([z.string(), z.null()]),
		linkedConversations: z.array(LinkedConversation),
		conversationParts: z.array(ConversationPart).optional(),
		createdAt: z.string(),
		updatedAt: z.string(),
		integrations: z
			.object({
				linear: z.array(z.object({ issueId: z.string(), issueUrl: z.union([z.string(), z.null()]) }).passthrough()),
				jira: z.array(z.object({ issueId: z.string(), issueUrl: z.union([z.string(), z.null()]) }).passthrough()),
				clickup: z.array(z.object({ id: z.string(), url: z.string(), title: z.string() }).passthrough()),
				github: z.array(
					z
						.object({ id: z.string(), number: z.string(), repositoryName: z.string(), repositoryFullName: z.string(), url: z.string(), title: z.string() })
						.passthrough(),
				),
				devops: z.array(z.object({ id: z.number(), url: z.string(), projectId: z.string(), projectName: z.string(), title: z.string() }).passthrough()),
				hubspot: z.array(
					z
						.object({
							objectId: z.number(),
							type: z.enum(['TICKET', 'DEAL', 'CONTACT']),
							dealAmount: z.union([z.number(), z.null()]),
							dealClosed: z.union([z.boolean(), z.null()]),
						})
						.passthrough(),
				),
			})
			.passthrough(),
	})
	.passthrough();
const TicketList = z.object({ object: z.literal('list'), data: z.array(Ticket), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const createTicket_Body = z.object({
	ticketCategoryId: z.string(),
	title: z.string().min(2),
	content: z.string().optional().default(''),
	author: AuthorInput,
	customFields: z.object({}).partial().passthrough().optional(),
	companyId: z.string().optional(),
	linkedConversationId: z.string().optional(),
	assigneeId: z.string().optional(),
	createdAt: z.union([z.string(), z.null()]).optional(),
	skipNotifications: z.boolean().optional().default(false),
	statusId: z.string().optional(),
});
const updateTicket_Body = z
	.object({
		title: z.string().min(2),
		content: z.string(),
		statusId: z.string(),
		open: z.boolean(),
		assigneeId: z.union([z.string(), z.null()]),
		companyId: z.union([z.string(), z.null()]),
		customFields: z.object({}).partial().passthrough(),
		snoozedUntil: z.union([z.string(), z.null()]),
		skipNotifications: z.boolean().default(false),
	})
	.partial();
const DeletedTicket = z.object({ id: z.string(), object: z.literal('ticket'), deleted: z.literal(true) }).passthrough();
const replyToTicket_Body = z.union([
	z.object({
		type: z.literal('contact'),
		contactId: z.string().optional(),
		contactEmail: z.string().email().optional(),
		body: z.string().min(1),
		messageType: z.literal('comment').optional().default('comment'),
		attachmentUrls: z.array(z.string().url()).max(10).optional(),
		skipNotifications: z.boolean().optional().default(false),
		createdAt: z.union([z.string(), z.null()]).optional(),
	}),
	z.object({
		type: z.literal('admin'),
		adminId: z.string(),
		body: z.string().min(1),
		messageType: z.enum(['comment', 'note']).optional().default('comment'),
		attachmentUrls: z.array(z.string().url()).max(10).optional(),
		skipNotifications: z.boolean().optional().default(false),
		createdAt: z.union([z.string(), z.null()]).optional(),
	}),
]);
const WebhookRequestConfig = z.object({ timeoutMs: z.number().int().gte(1000).lte(30000), headers: z.record(z.string()).optional() }).passthrough();
const WebhookLastStatus = z.union([z.object({ code: z.number().int(), message: z.string(), timestamp: z.string() }).passthrough(), z.null()]);
const WebhookHealth = z
	.object({
		lastResponseTime: z.number(),
		avgResponseTime: z.number(),
		lastSuccessAt: z.union([z.string(), z.null()]),
		errorsSinceLastSuccess: z.number().int(),
		consecutiveFailures: z.number().int(),
	})
	.passthrough();
const Webhook = z
	.object({
		object: z.literal('webhook'),
		id: z.string(),
		name: z.string(),
		url: z.string(),
		secret: z.string(),
		description: z.union([z.string(), z.null()]),
		topics: z.array(
			z.enum([
				'post.created',
				'post.updated',
				'post.deleted',
				'post.voted',
				'ticket.created',
				'ticket.updated',
				'ticket.deleted',
				'changelog.published',
				'comment.created',
				'comment.updated',
				'comment.deleted',
				'conversation.user.created',
				'conversation.user.replied',
				'conversation.admin.replied',
				'conversation.admin.closed',
				'conversation.handover_requested',
				'conversation.admin.assigned',
				'conversation.admin.noted',
				'conversation.admin.snoozed',
				'conversation.admin.unsnoozed',
				'conversation.admin.opened',
				'conversation.priority.updated',
				'conversation.deleted',
				'conversation.contact.attached',
				'conversation.contact.detached',
				'conversation.read',
				'conversation_part.redacted',
			]),
		),
		status: z.enum(['active', 'paused', 'suspended']),
		requestConfig: WebhookRequestConfig,
		lastStatus: WebhookLastStatus,
		health: WebhookHealth,
		version: z.string(),
		createdAt: z.string(),
		updatedAt: z.string(),
	})
	.passthrough();
const WebhookList = z.object({ object: z.literal('list'), data: z.array(Webhook), nextCursor: z.union([z.string(), z.null()]) }).passthrough();
const WebhookRequestConfigInput = z
	.object({ headers: z.record(z.string().max(1024)) })
	.partial()
	.passthrough();
const CreateWebhookBody = z
	.object({
		name: z.string().min(1).max(255),
		url: z.string(),
		description: z.string().max(500).optional(),
		topics: z
			.array(
				z.enum([
					'post.created',
					'post.updated',
					'post.deleted',
					'post.voted',
					'ticket.created',
					'ticket.updated',
					'ticket.deleted',
					'changelog.published',
					'comment.created',
					'comment.updated',
					'comment.deleted',
					'conversation.user.created',
					'conversation.user.replied',
					'conversation.admin.replied',
					'conversation.admin.closed',
					'conversation.handover_requested',
					'conversation.admin.assigned',
					'conversation.admin.noted',
					'conversation.admin.snoozed',
					'conversation.admin.unsnoozed',
					'conversation.admin.opened',
					'conversation.priority.updated',
					'conversation.deleted',
					'conversation.contact.attached',
					'conversation.contact.detached',
					'conversation.read',
					'conversation_part.redacted',
				]),
			)
			.min(1),
		requestConfig: WebhookRequestConfigInput.optional(),
	})
	.passthrough();
const UpdateWebhookBody = z
	.object({
		name: z.string().min(1).max(255),
		url: z.string(),
		description: z.union([z.string(), z.null()]),
		topics: z
			.array(
				z.enum([
					'post.created',
					'post.updated',
					'post.deleted',
					'post.voted',
					'ticket.created',
					'ticket.updated',
					'ticket.deleted',
					'changelog.published',
					'comment.created',
					'comment.updated',
					'comment.deleted',
					'conversation.user.created',
					'conversation.user.replied',
					'conversation.admin.replied',
					'conversation.admin.closed',
					'conversation.handover_requested',
					'conversation.admin.assigned',
					'conversation.admin.noted',
					'conversation.admin.snoozed',
					'conversation.admin.unsnoozed',
					'conversation.admin.opened',
					'conversation.priority.updated',
					'conversation.deleted',
					'conversation.contact.attached',
					'conversation.contact.detached',
					'conversation.read',
					'conversation_part.redacted',
				]),
			)
			.min(1),
		status: z.enum(['active', 'paused']),
		requestConfig: WebhookRequestConfigInput,
	})
	.partial()
	.passthrough();
const DeletedWebhook = z.object({ id: z.string(), object: z.literal('webhook'), deleted: z.literal(true) }).passthrough();
const FeaturebaseVersion = z.string();

export const schemas = {
	BoardAccess,
	BoardFeatures,
	BoardPostDefaults,
	BoardLocalization,
	Board,
	BoardList,
	ValidationError,
	NotFoundError,
	ServerError,
	boardId,
	tags,
	inReview,
	PostAuthor,
	PostStatus,
	PostTag,
	PostFeatures,
	PostAccess,
	Post,
	PaginationMetadata,
	PostList,
	AuthorInput,
	CreatePostBody,
	UpdatePostBody,
	DeletedPost,
	Company,
	User,
	UserList,
	AddVoterBody,
	AddVoterResponse,
	RemoveVoterBody,
	RemoveVoterResponse,
	PostStatusList,
	CommentAuthor,
	Comment,
	CommentList,
	CreateCommentBody,
	UpdateCommentBody,
	DeletedComment,
	startDate,
	ChangelogCategory,
	ChangelogLocaleNotification,
	Changelog,
	ChangelogList,
	CreateChangelogBody,
	UpdateChangelogBody,
	DeletedChangelog,
	PublishChangelogBody,
	PublishUnpublishSuccess,
	UnpublishChangelogBody,
	AddChangelogSubscribersBody,
	ChangelogSubscribersImport,
	RemoveChangelogSubscribersBody,
	ChangelogSubscribersRemoval,
	Admin,
	AdminList,
	AdminRolePermissions,
	AdminRole,
	AdminRoleList,
	CustomFieldOption,
	CustomField,
	CustomFieldList,
	SurveyUrlTargeting,
	SurveyCssTargeting,
	SurveyTargeting,
	SurveyChoice,
	SurveyNextAction,
	SurveyPageLogic,
	SurveyPage,
	Survey,
	SurveyList,
	Contact,
	SurveySingleResponse,
	SurveyResponse,
	SurveyResponseList,
	HelpCenterNavItem,
	HelpCenterUrls,
	HelpCenterTranslation,
	HelpCenter,
	HelpCenterList,
	CollectionIcon,
	CollectionAuthor,
	CollectionTranslation,
	Collection,
	CollectionList,
	CollectionIcon_Nova,
	CollectionTranslationInput_Nova,
	CreateCollectionBody_Nova,
	UpdateCollectionBody_Nova,
	DeletedCollection,
	ArticleIcon,
	ArticleAuthor,
	ArticleTranslation,
	Article,
	ArticleList,
	ArticleIconInput_Nova,
	ArticleTranslationInput_Nova,
	CreateArticleBody_Nova,
	UpdateArticleBody_Nova,
	DeletedArticle,
	RedirectRule,
	RedirectRuleList,
	CreateRedirectRuleBody_Nova,
	UpdateRedirectRuleBody_Nova,
	DeletedRedirectRule,
	ContactList,
	UpsertContactCompany,
	UpsertContactBody,
	DeletedContact,
	ContactEmailPreferenceState,
	ContactEmailPreferences,
	ContactEmailPreferencesOutput,
	UpdateContactEmailPreferenceBody,
	BlockedContact,
	UnblockedContact,
	Icon,
	Team,
	TeamList,
	CompanyList,
	UpsertCompanyBody,
	DeletedCompany,
	AttachContactToCompanyBody,
	Brand,
	BrandList,
	ConversationParticipant,
	MessageSource,
	ConversationTag,
	ReadReceipt,
	CsatRatedAgent,
	CsatWorkflowLink,
	ConversationCsatSummary,
	CsatEmailDelivery,
	ConversationCsatHistoryEntry,
	ConversationCsatDebug,
	ConversationPartAuthor,
	ConversationTagMutationActor,
	ConversationTagApplication,
	UserMessagePart,
	AdminMessagePart,
	AdminNotePart,
	EmailMessagePart,
	BotMessagePart,
	QuickReplyOptionsPart,
	QuickReplyResponsePart,
	RatingRequestedCsatPayload,
	RatingRequestedPart,
	RatingSubmittedCsatPayload,
	RatingSubmittedPart,
	AttributeCollectionPromptPart,
	AttributeCollectionCompletePart,
	AssignmentPart,
	StatusChangePart,
	TagUpdatePart,
	WorkflowWaitEventPayload,
	WorkflowWaitPart,
	PriorityChangePart,
	ParticipantAddedPart,
	ConversationPart,
	Conversation,
	ConversationList,
	ConversationFromContact,
	ConversationFromAdmin,
	ConversationFrom,
	EmailRecipients,
	OutreachRecipients,
	CreateConversationBody,
	DeletedConversation,
	MarkAsRead,
	UpdateConversationBody,
	AttachConversationTagBody,
	AttachedConversationTag,
	DetachConversationTagBody,
	ContactReplyBody,
	AdminReplyBody,
	ReplyToConversationBody,
	ParticipantIdentifier,
	AddParticipantBody,
	RemoveParticipantBody,
	RedactConversationPartBody,
	TagList,
	UpsertTagBody,
	DeleteTagBody,
	DeletedTag,
	TicketAuthor,
	LinkedConversation,
	Ticket,
	TicketList,
	createTicket_Body,
	updateTicket_Body,
	DeletedTicket,
	replyToTicket_Body,
	WebhookRequestConfig,
	WebhookLastStatus,
	WebhookHealth,
	Webhook,
	WebhookList,
	WebhookRequestConfigInput,
	CreateWebhookBody,
	UpdateWebhookBody,
	DeletedWebhook,
	FeaturebaseVersion,
};

const endpoints = makeApi([
	{
		method: 'get',
		path: '/v2/admins',
		alias: 'listAdmins',
		description: `Returns all admins for your organization.

This endpoint returns all admins at once (typically a small list). No pagination is supported.

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of admin objects
- &#x60;nextCursor&#x60; - Always null

### Admin Object

Each admin includes:
- &#x60;id&#x60; - Unique admin identifier
- &#x60;name&#x60; - Admin&#x27;s display name
- &#x60;email&#x60; - Admin&#x27;s email address
- &#x60;picture&#x60; - Profile picture URL
- &#x60;roleId&#x60; - ID of the role assigned to this admin`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: AdminList,
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/admins/:id',
		alias: 'getAdmin',
		description: `Retrieves a single admin by their unique identifier.

Returns the admin object if found and they belong to your organization.

### Response

Returns an admin object with:
- &#x60;id&#x60; - Unique admin identifier
- &#x60;name&#x60; - Admin&#x27;s display name
- &#x60;email&#x60; - Admin&#x27;s email address
- &#x60;picture&#x60; - Profile picture URL
- &#x60;roleId&#x60; - ID of the role assigned to this admin

### Errors

- &#x60;404&#x60; - Admin not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Admin,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The admin ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;admin_not_found&#x60;: No admin exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('admin_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/admins/roles',
		alias: 'listAdminRoles',
		description: `Returns all available admin roles and their permissions.

This endpoint returns all roles at once (typically a small list). No pagination is supported.

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of admin role objects
- &#x60;nextCursor&#x60; - Always null

### Admin Role Object

Each role includes:
- &#x60;id&#x60; - Unique role identifier
- &#x60;name&#x60; - Role name (e.g., &quot;Admin&quot;, &quot;Viewer&quot;)
- &#x60;permissions&#x60; - Object containing permission flags

### Permissions

The permissions object contains boolean flags for each permission:
- &#x60;view_comments_private&#x60; - Can view private comments
- &#x60;manage_comments&#x60; - Can manage comments
- &#x60;manage_comments_private&#x60; - Can manage private comments
- &#x60;set_comment_pinned&#x60; - Can pin comments
- &#x60;moderate_comments&#x60; - Can moderate comments
- &#x60;set_post_category&#x60; - Can change post categories
- &#x60;set_post_pinned&#x60; - Can pin posts
- &#x60;set_post_eta&#x60; - Can set post ETA
- &#x60;set_post_tags&#x60; - Can manage post tags
- &#x60;set_post_author&#x60; - Can change post author
- &#x60;set_post_status&#x60; - Can change post status
- &#x60;set_post_assignee&#x60; - Can assign posts
- &#x60;set_post_custom_fields&#x60; - Can edit custom fields
- &#x60;post_vote_on_behalf&#x60; - Can vote on behalf of users
- &#x60;post_merge&#x60; - Can merge posts
- &#x60;post_import&#x60; - Can import posts
- &#x60;post_export&#x60; - Can export posts
- &#x60;moderate_posts&#x60; - Can moderate posts
- &#x60;view_users&#x60; - Can view users
- &#x60;manage_users&#x60; - Can manage users
- &#x60;view_posts_private&#x60; - Can view private posts
- &#x60;view_private_post_tags&#x60; - Can view private tags
- &#x60;manage_changelogs&#x60; - Can manage changelogs
- &#x60;manage_surveys&#x60; - Can manage surveys
- &#x60;manage_branding&#x60; - Can manage branding
- &#x60;manage_billing&#x60; - Can manage billing
- &#x60;manage_team_members&#x60; - Can manage team members
- &#x60;manage_sso&#x60; - Can manage SSO settings
- &#x60;manage_api&#x60; - Can manage API settings
- &#x60;manage_statuses&#x60; - Can manage statuses
- &#x60;manage_boards&#x60; - Can manage boards
- &#x60;manage_post_tags&#x60; - Can manage post tags
- &#x60;manage_custom_fields&#x60; - Can manage custom fields
- &#x60;manage_moderation_settings&#x60; - Can manage moderation
- &#x60;manage_roadmap&#x60; - Can manage roadmap
- &#x60;manage_user_roles&#x60; - Can manage user roles
- &#x60;manage_prioritization&#x60; - Can manage prioritization
- &#x60;manage_notifications&#x60; - Can manage notifications
- &#x60;manage_custom_domain&#x60; - Can manage custom domain
- &#x60;manage_integrations&#x60; - Can manage integrations
- &#x60;use_integrations&#x60; - Can use integrations
- &#x60;manage_help_center&#x60; - Can manage help center
- &#x60;auto_approve_posts&#x60; - Posts auto-approved`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: AdminRoleList,
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/boards',
		alias: 'listBoards',
		description: `Returns all boards (post categories) for the authenticated organization.

Boards are containers for posts/feedback. Each board can have different:
- Access controls (public, private, segment-restricted)
- Feature toggles (comments, posting enabled)
- Custom fields

This endpoint returns all boards without pagination. Organizations typically have a small number of boards.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: z.array(Board),
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/boards/:id',
		alias: 'getBoard',
		description: `Retrieves a single board by its unique identifier.

Returns the full board object including all access controls,
feature toggles, and localization settings.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Board,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The board ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;board_not_found&#x60;: No board exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('board_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/brands',
		alias: 'listBrands',
		description: `Returns all brands in your organization with cursor-based pagination.

### Query Parameters

- &#x60;limit&#x60; - Number of brands to return (1-100, default: 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response for pagination

### Response Structure

The response includes:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of brand objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Brand Object

Each brand includes:
- &#x60;id&#x60; - Featurebase internal ID (MongoDB ObjectId)
- &#x60;name&#x60; - Brand display name
- &#x60;isDefault&#x60; - Whether this is the default brand
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp
- &#x60;helpCenterId&#x60; - Associated help center ID
- &#x60;senderEmailAddressId&#x60; - Default sender email address ID

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;brand&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;name&quot;: &quot;Default Brand&quot;,
      &quot;isDefault&quot;: true,
      &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;,
      &quot;updatedAt&quot;: &quot;2025-01-10T15:30:00.000Z&quot;,
      &quot;helpCenterId&quot;: &quot;11&quot;,
      &quot;senderEmailAddressId&quot;: &quot;507f1f77bcf86cd799439012&quot;
    }
  ],
  &quot;nextCursor&quot;: null
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: BrandList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/brands/:id',
		alias: 'getBrandById',
		description: `Retrieves a single brand by its Featurebase ID.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the brand (MongoDB ObjectId)

### Response

Returns a brand object with:
- &#x60;id&#x60; - Featurebase internal ID
- &#x60;name&#x60; - Brand display name
- &#x60;isDefault&#x60; - Whether this is the default brand
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp
- &#x60;helpCenterId&#x60; - Associated help center ID
- &#x60;senderEmailAddressId&#x60; - Default sender email address ID

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;brand&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;name&quot;: &quot;Default Brand&quot;,
  &quot;isDefault&quot;: true,
  &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-10T15:30:00.000Z&quot;,
  &quot;helpCenterId&quot;: &quot;11&quot;,
  &quot;senderEmailAddressId&quot;: &quot;507f1f77bcf86cd799439012&quot;
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Brand with the specified ID does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Brand,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The brand ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;brand_not_found&#x60;: No brand exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('brand_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/changelogs',
		alias: 'listChangelogs',
		description: `Returns all changelogs for the authenticated organization.

Changelogs are release notes and updates that keep users informed about new features, improvements, and bug fixes. Each changelog can have:
- Multiple translations (locales)
- Categories for organization
- Featured images
- Scheduled publishing

### Pagination

This endpoint uses **cursor-based pagination**:

- &#x60;limit&#x60; - Number of changelogs to return (1-100, default 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response&#x27;s &#x60;nextCursor&#x60; field

**Example:** To paginate through results:
1. First request: &#x60;GET /v2/changelogs?limit&#x3D;10&#x60;
2. If &#x60;nextCursor&#x60; is not null, use it for the next page
3. Next request: &#x60;GET /v2/changelogs?limit&#x3D;10&amp;cursor&#x3D;{nextCursor}&#x60;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of changelog objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Filtering

Filter changelogs using query parameters:
- &#x60;id&#x60; - Find a specific changelog by ID or slug
- &#x60;q&#x60; - Search query for title/content
- &#x60;categories&#x60; - Filter by category names
- &#x60;locale&#x60; - Get changelogs in a specific locale (defaults to org default)
- &#x60;state&#x60; - Filter by state: &#x60;live&#x60;, &#x60;draft&#x60;, or &#x60;all&#x60;
- &#x60;startDate&#x60; - Include changelogs dated on or after this date
- &#x60;endDate&#x60; - Include changelogs dated on or before this date

### Sorting

Results are sorted by date (descending by default):
- &#x60;sortBy&#x60; - Field to sort by (currently only &#x60;date&#x60;)
- &#x60;sortOrder&#x60; - Sort direction: &#x60;asc&#x60; or &#x60;desc&#x60; (default: &#x60;desc&#x60;)`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'q',
				type: 'Query',
				schema: z.string().max(255).optional(),
			},
			{
				name: 'categories',
				type: 'Query',
				schema: tags,
			},
			{
				name: 'locale',
				type: 'Query',
				schema: z
					.enum([
						'bn',
						'bs',
						'pt-BR',
						'bg',
						'ca',
						'hr',
						'cs',
						'da',
						'nl',
						'en',
						'et',
						'fi',
						'fr',
						'de',
						'el',
						'hi',
						'hu',
						'id',
						'it',
						'ja',
						'ko',
						'lv',
						'lt',
						'ms',
						'mn',
						'nb',
						'pl',
						'pt',
						'ro',
						'ru',
						'sr',
						'zh-CN',
						'sk',
						'sl',
						'es',
						'sw',
						'sv',
						'th',
						'zh-TW',
						'tr',
						'uk',
						'vi',
					])
					.optional(),
			},
			{
				name: 'state',
				type: 'Query',
				schema: z.enum(['draft', 'live', 'all']).optional().default('live'),
			},
			{
				name: 'startDate',
				type: 'Query',
				schema: startDate,
			},
			{
				name: 'endDate',
				type: 'Query',
				schema: startDate,
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'sortBy',
				type: 'Query',
				schema: z.literal('date').optional().default('date'),
			},
			{
				name: 'sortOrder',
				type: 'Query',
				schema: z.enum(['asc', 'desc']).optional().default('desc'),
			},
		],
		response: ChangelogList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/changelogs',
		alias: 'createChangelog',
		description: `Creates a new changelog for the authenticated organization.

### Required Fields

- &#x60;title&#x60; - The title of the changelog

### Content

Provide content in one of two formats (at least one is required):
- &#x60;htmlContent&#x60; - HTML content of the changelog
- &#x60;markdownContent&#x60; - Markdown content of the changelog

**Note:** For images in content, you can use:
- External URLs in img src attributes (automatically uploaded to our storage)
- Base64 encoded data URIs (data:image/...) which are processed and stored

### Optional Fields

- &#x60;categories&#x60; - Array of category names (e.g., [&quot;New&quot;, &quot;Fixed&quot;, &quot;Improved&quot;])
- &#x60;featuredImage&#x60; - URL of the featured image (external URLs are uploaded to our storage)
- &#x60;allowedSegmentIds&#x60; - Array of segment IDs that are allowed to view the changelog
- &#x60;locale&#x60; - The locale of the changelog (defaults to organization default)
- &#x60;date&#x60; - The date of the changelog
- &#x60;state&#x60; - The state of the changelog: &#x60;draft&#x60; (default) or &#x60;live&#x60;

### Response

Returns the created changelog object.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateChangelogBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Changelog,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid or missing required fields`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/changelogs/:id',
		alias: 'getChangelog',
		description: `Retrieves a single changelog by its unique identifier or slug.

Returns the full changelog object including:
- Title and content (in HTML and markdown formats)
- Featured image
- Publication date
- Categories
- Comment count
- Email notification status

### Localization

The changelog content is returned in the organization&#x27;s default locale.
If the changelog doesn&#x27;t exist in the default locale, the first available locale is used.

### State

Both published (&#x60;live&#x60;) and draft changelogs can be retrieved.
The &#x60;state&#x60; field indicates the current publication status.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Changelog,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The changelog ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;changelog_not_found&#x60;: No changelog exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('changelog_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/changelogs/:id',
		alias: 'updateChangelog',
		description: `Updates an existing changelog by its unique identifier.

You can update:
- **title** - The changelog title
- **htmlContent** - HTML content (one of htmlContent or markdownContent)
- **markdownContent** - Markdown content (one of htmlContent or markdownContent)
- **categories** - Array of category names
- **featuredImage** - Featured image URL
- **allowedSegmentIds** - Segment IDs for access control
- **date** - The date of the changelog

### Content Format

Provide content in one of two formats:
- &#x60;htmlContent&#x60; - HTML content of the changelog
- &#x60;markdownContent&#x60; - Markdown content of the changelog

**Note:** For images in content, you can use:
- External URLs in img src attributes (automatically uploaded to our storage)
- Base64 encoded data URIs (data:image/...) which are processed and stored

### Categories

Provide category names as an array. The categories must already exist in your organization.

**Example:** &#x60;[&quot;New&quot;, &quot;Fixed&quot;, &quot;Improved&quot;]&#x60;

### Response

Returns the updated changelog object with all fields populated.

### Errors

- &#x60;400&#x60; - Invalid changelog ID format or invalid input
- &#x60;404&#x60; - Changelog not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateChangelogBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Changelog,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The changelog ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;changelog_not_found&#x60;: No changelog exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('changelog_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/changelogs/:id',
		alias: 'deleteChangelog',
		description: `Deletes a changelog by its unique identifier.

### Deletion Behavior

The changelog and all associated comments are permanently deleted. This action cannot be undone.

### Permissions

Only organization admins can delete changelogs.

### Response

Returns a deletion confirmation:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;6457e3ff70afca5d8c27dccc&quot;,
  &quot;object&quot;: &quot;changelog&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid changelog ID format
- &#x60;404&#x60; - Changelog not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedChangelog,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The changelog ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;changelog_not_found&#x60;: No changelog exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('changelog_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/changelogs/:id/publish',
		alias: 'publishChangelog',
		description: `Publishes a changelog and optionally sends an email notification to subscribers.

### Optional Fields

- &#x60;sendEmail&#x60; - Whether to send an email notification to subscribers (default: false)
- &#x60;locales&#x60; - Array of locales to publish. An empty array publishes to all available locales
- &#x60;scheduledDate&#x60; - A future date/time when the changelog should be published

### Scheduling

If &#x60;scheduledDate&#x60; is provided:
- Must be a future date
- The changelog will be scheduled for publishing at that time
- Any existing scheduled publish for the same locales will be cancelled and replaced

### Email Notifications

If &#x60;sendEmail&#x60; is true:
- Email notifications are sent to all subscribers in the published locales
- Emails are only sent once per locale (won&#x27;t resend on republish)

### Response

Returns a success confirmation:

&#x60;&#x60;&#x60;json
{
  &quot;success&quot;: true,
  &quot;state&quot;: &quot;published&quot;
}
&#x60;&#x60;&#x60;

Or for scheduled publishes:

&#x60;&#x60;&#x60;json
{
  &quot;success&quot;: true,
  &quot;state&quot;: &quot;scheduled&quot;
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid changelog ID or scheduled date is not in the future
- &#x60;404&#x60; - Changelog not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: PublishChangelogBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: PublishUnpublishSuccess,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The changelog ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;changelog_not_found&#x60;: No changelog exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('changelog_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/changelogs/:id/unpublish',
		alias: 'unpublishChangelog',
		description: `Unpublishes a changelog, removing it from public view.

### Optional Fields

- &#x60;locales&#x60; - Array of locales to unpublish from. An empty array unpublishes from all locales

### Behavior

- The changelog content is preserved (reverts to draft state)
- Any scheduled publishes for the specified locales are cancelled
- The changelog can be re-published later

### Response

Returns a success confirmation:

&#x60;&#x60;&#x60;json
{
  &quot;success&quot;: true,
  &quot;state&quot;: &quot;unpublished&quot;
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid changelog ID format
- &#x60;404&#x60; - Changelog not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UnpublishChangelogBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: PublishUnpublishSuccess,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The changelog ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;changelog_not_found&#x60;: No changelog exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('changelog_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/changelogs/subscribers',
		alias: 'addChangelogSubscribers',
		description: `Adds email addresses as changelog subscribers in bulk.

Subscribers will receive email notifications when new changelogs are published (if email notifications are enabled during publishing).

### Request Body

- &#x60;emails&#x60; - Array of email addresses to add (required, 1-1000 emails)
- &#x60;locale&#x60; - Locale for the subscribers (optional, defaults to organization default)

### Email Validation

- Invalid email addresses are automatically filtered out
- Emails are normalized (trimmed, lowercased)
- Duplicate emails are deduplicated

### Rate Limiting

This endpoint is rate limited to prevent abuse. If you need to import more subscribers, please contact support.

### Response

Returns a confirmation with the count of processed emails:

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;changelog_subscribers_import&quot;,
  &quot;count&quot;: 150
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid request (empty emails array, too many emails)
- &#x60;429&#x60; - Rate limit exceeded`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AddChangelogSubscribersBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: ChangelogSubscribersImport,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Empty emails array or too many emails`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/changelogs/subscribers',
		alias: 'removeChangelogSubscribers',
		description: `Removes email addresses from changelog subscribers in bulk.

Removed subscribers will no longer receive email notifications when new changelogs are published.

### Request Body

- &#x60;emails&#x60; - Array of email addresses to remove (required, 1-1000 emails)

### Email Handling

- Emails that don&#x27;t exist as subscribers are silently ignored
- Emails are normalized (trimmed, lowercased) before matching

### Response

Returns a confirmation with the count of processed emails:

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;changelog_subscribers_removal&quot;,
  &quot;count&quot;: 150
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid request (empty emails array, too many emails)`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RemoveChangelogSubscribersBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: ChangelogSubscribersRemoval,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Empty emails array or too many emails`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/comment',
		alias: 'deleteCommentClover',
		description: `Deletes a comment using the legacy Clover API format.

This endpoint accepts the comment ID in the request body instead of the route parameter.

### Request Body

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Deletion Behavior

- **Comments with replies**: Soft delete
  - Content is replaced with &quot;[deleted]&quot;
  - Author information is anonymized
  - Comment remains visible to maintain conversation context
  - Votes and scores are reset to 0

- **Comments without replies**: Hard delete
  - Comment is permanently removed from the database
  - All associated data is deleted

### Permissions

- Comment authors can delete their own comments
- Admins can delete any comment (subject to permissions)
- Lite seat admins can only delete their own comments
- Non-authors require &#x60;manage_comments&#x60; or &#x60;manage_comments_private&#x60; permission

### Response

Returns a success confirmation (Clover format):

&#x60;&#x60;&#x60;json
{
  &quot;success&quot;: true
}
&#x60;&#x60;&#x60;

Note: Nova API returns &#x60;{ id, object: &quot;comment&quot;, deleted: true }&#x60;, but Clover transformer converts it to &#x60;{ success: true }&#x60; for backwards compatibility.

### Errors

- &#x60;400&#x60; - Invalid comment ID format or missing ID in body
- &#x60;403&#x60; - Not authorized to delete this comment
- &#x60;404&#x60; - Comment not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ id: z.string() }).passthrough(),
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: z.object({ success: z.boolean() }).passthrough(),
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The comment ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;comment_not_found&#x60;: No comment exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('comment_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/comments',
		alias: 'listComments',
		description: `Returns comments for your organization.

Comments are threaded discussions. Each comment can have:
- Author information
- Voting (upvotes/downvotes)
- Privacy settings (public/private)
- Moderation status
- Parent comment reference for threading

### Filtering

Optionally filter by:
- &#x60;postId&#x60; - Get comments for a specific post
- &#x60;changelogId&#x60; - Get comments for a specific changelog

If no filter is provided, returns all comments across the organization.

### Pagination

This endpoint uses **cursor-based pagination**:

- &#x60;limit&#x60; - Number of comments to return (1-100, default 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response&#x27;s &#x60;nextCursor&#x60; field

**Example:** To paginate through results:
1. First request: &#x60;GET /v2/comments?postId&#x3D;{id}&amp;limit&#x3D;10&#x60;
2. If &#x60;nextCursor&#x60; is not null, use it for the next page
3. Next request: &#x60;GET /v2/comments?postId&#x3D;{id}&amp;limit&#x3D;10&amp;cursor&#x3D;{nextCursor}&#x60;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of comment objects (flat structure with &#x60;parentCommentId&#x60; for threading)
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Comment Structure

Each comment includes:
- &#x60;id&#x60; - Unique comment identifier
- &#x60;postId&#x60; / &#x60;changelogId&#x60; - Reference to the parent content
- &#x60;parentCommentId&#x60; - Reference to parent comment (null for root comments)
- &#x60;content&#x60; - Comment content in HTML format
- &#x60;author&#x60; - Author information (id, name, profilePicture, type)
- &#x60;upvotes&#x60; / &#x60;downvotes&#x60; / &#x60;score&#x60; - Voting metrics
- &#x60;isPrivate&#x60; - Whether comment is only visible to admins
- &#x60;inReview&#x60; - Whether comment is pending moderation
- &#x60;created&#x60; / &#x60;updated&#x60; - Unix timestamps

### Additional Filters

- &#x60;privacy&#x60; - Filter by privacy: &quot;public&quot;, &quot;private&quot;, or &quot;all&quot;
- &#x60;inReview&#x60; - Filter by moderation status (true/false)

### Sorting

Use &#x60;sortBy&#x60; to sort results:
- &#x60;best&#x60; - Sort by confidence score (default, like Reddit)
- &#x60;top&#x60; - Sort by net score (upvotes - downvotes)
- &#x60;new&#x60; - Sort by creation date, newest first
- &#x60;old&#x60; - Sort by creation date, oldest first`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'postId',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'changelogId',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'privacy',
				type: 'Query',
				schema: z.enum(['public', 'private', 'all']).optional(),
			},
			{
				name: 'inReview',
				type: 'Query',
				schema: inReview,
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'sortBy',
				type: 'Query',
				schema: z.enum(['best', 'top', 'new', 'old']).optional().default('best'),
			},
		],
		response: CommentList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: The specified post or changelog was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/comments',
		alias: 'createComment',
		description: `Creates a new comment or reply to an existing comment.

You can create a comment for a post or changelog. Comments support:
- HTML content (images are automatically uploaded to our storage)
- Threading (replies via &#x60;parentCommentId&#x60;)
- Privacy controls (private comments visible only to admins)
- Author attribution (post on behalf of users)

### Required Fields

- &#x60;content&#x60; - Comment content in HTML format
- &#x60;postId&#x60; OR &#x60;changelogId&#x60; - One is required to specify the target

### Optional Fields

- &#x60;parentCommentId&#x60; - Create a reply to an existing comment
- &#x60;isPrivate&#x60; - Make comment visible only to admins (default: false)
- &#x60;sendNotification&#x60; - Notify voters about the comment (default: true)
- &#x60;author&#x60; - Post comment under a specific user (uses authenticated user if not provided)
- &#x60;createdAt&#x60; - Backdate creation (useful for imports)

### Author Object

The &#x60;author&#x60; field supports multiple identification methods:
- &#x60;id&#x60; - Featurebase user ID (direct reference)
- &#x60;userId&#x60; - External user ID from your system (via SSO)
- &#x60;email&#x60; - Email address (finds existing or creates new user)
- &#x60;name&#x60; - Display name (used with email for new users)
- &#x60;profilePicture&#x60; - Profile picture URL

If no author is provided, the comment is posted under the authenticated user.

### Content Format

Content should be formatted as HTML. For images:
- External URLs in &#x60;img src&#x60; attributes are automatically pulled into our storage
- Base64 encoded data URIs (&#x60;data:image/...&#x60;) are also supported and processed

### Response

Returns the created comment object with all fields populated, including:
- &#x60;id&#x60; - Unique comment identifier
- &#x60;author&#x60; - Author information
- Voting stats and timestamps

### Errors

- &#x60;400&#x60; - Invalid input (missing required fields, invalid IDs)
- &#x60;403&#x60; - Commenting disabled or not authorized
- &#x60;404&#x60; - Post/changelog not found or parent comment not found`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateCommentBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Comment,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid or missing required fields`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;feature_disabled&#x60;: Commenting is disabled on this board`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('feature_disabled'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: The specified post or changelog was not found
- &#x60;comment_not_found&#x60;: The parent comment was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['post_not_found', 'comment_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/comments/:id',
		alias: 'getComment',
		description: `Retrieves a single comment by its unique identifier.

Returns the full comment object including:
- Author information
- Voting stats (upvotes, downvotes, score)
- Privacy and moderation status
- Threading information (parentCommentId)
- Timestamps

### Response

Returns a comment object with all fields populated.

### Errors

- &#x60;400&#x60; - Invalid comment ID format
- &#x60;404&#x60; - Comment not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Comment,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The comment ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;comment_not_found&#x60;: No comment exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('comment_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/comments/:id',
		alias: 'updateComment',
		description: `Updates an existing comment by its unique identifier.

You can update:
- **content** - Comment text (HTML format)
- **isPrivate** - Privacy status (admin-only visibility)
- **isPinned** - Pinned status (displayed at top)
- **inReview** - Moderation status

### Content Format

Content should be formatted as HTML. For images:
- External URLs in &#x60;img src&#x60; attributes are automatically pulled into our storage
- Base64 encoded data URIs (&#x60;data:image/...&#x60;) are also supported and processed

### Permissions

- Comment authors can update their own comment content
- Admin permissions required for:
  - &#x60;isPrivate&#x60; - Requires &#x60;manage_comments_private&#x60; permission
  - &#x60;isPinned&#x60; - Requires &#x60;set_comment_pinned&#x60; permission
  - &#x60;inReview&#x60; - Requires &#x60;moderate_comments&#x60; permission
  - Updating other users&#x27; comments - Requires &#x60;moderate_comments&#x60; permission

### Response

Returns the updated comment object with all fields populated.

### Errors

- &#x60;400&#x60; - Invalid comment ID format or input
- &#x60;403&#x60; - Not authorized to update this comment
- &#x60;404&#x60; - Comment not found`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateCommentBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Comment,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The comment ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;comment_not_found&#x60;: No comment exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('comment_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/comments/:id',
		alias: 'deleteComment',
		description: `Deletes a comment by its unique identifier.

### Deletion Behavior

- **Comments with replies**: Soft delete
  - Content is replaced with &quot;[deleted]&quot;
  - Author information is anonymized
  - Comment remains visible to maintain conversation context
  - Votes and scores are reset to 0

- **Comments without replies**: Hard delete
  - Comment is permanently removed from the database
  - All associated data is deleted

### Permissions

- Comment authors can delete their own comments
- Admins can delete any comment (subject to permissions)
- Lite seat admins can only delete their own comments
- Non-authors require &#x60;manage_comments&#x60; or &#x60;manage_comments_private&#x60; permission

### Response

Returns a deletion confirmation:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;comment&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Errors

- &#x60;400&#x60; - Invalid comment ID format
- &#x60;403&#x60; - Not authorized to delete this comment
- &#x60;404&#x60; - Comment not found or doesn&#x27;t belong to your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedComment,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The comment ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;comment_not_found&#x60;: No comment exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('comment_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/companies',
		alias: 'listCompanies',
		description: `Returns all companies in your organization with cursor-based pagination.

### Query Parameters

- &#x60;limit&#x60; - Number of companies to return (1-100, default: 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response for pagination

### Response Structure

The response includes:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of company objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Company Object

Each company includes:
- &#x60;id&#x60; - Featurebase internal ID (MongoDB ObjectId)
- &#x60;companyId&#x60; - External company ID from your system
- &#x60;name&#x60; - Company name
- &#x60;monthlySpend&#x60; - Monthly spend/revenue
- &#x60;industry&#x60; - Industry
- &#x60;website&#x60; - Company website URL
- &#x60;plan&#x60; - Plan/tier name
- &#x60;linkedUsers&#x60; - Number of users linked to this company
- &#x60;companySize&#x60; - Employee headcount
- &#x60;lastActivity&#x60; - Last activity timestamp
- &#x60;customFields&#x60; - Custom field values
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;company&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;companyId&quot;: &quot;comp_12345&quot;,
      &quot;name&quot;: &quot;Acme Inc&quot;,
      &quot;monthlySpend&quot;: 5000,
      &quot;industry&quot;: &quot;Technology&quot;,
      &quot;website&quot;: &quot;https://acme.com&quot;,
      &quot;plan&quot;: &quot;enterprise&quot;,
      &quot;linkedUsers&quot;: 15,
      &quot;companySize&quot;: 250,
      &quot;lastActivity&quot;: &quot;2025-01-15T00:00:00.000Z&quot;,
      &quot;customFields&quot;: { &quot;location&quot;: &quot;Europe&quot; },
      &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;,
      &quot;updatedAt&quot;: &quot;2025-01-10T15:30:00.000Z&quot;
    }
  ],
  &quot;nextCursor&quot;: &quot;eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: CompanyList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/companies',
		alias: 'upsertCompany',
		description: `Creates a new company or updates an existing one.

Uses the external &#x60;companyId&#x60; as the unique identifier for upsert matching.
If a company with the given &#x60;companyId&#x60; already exists, it will be updated.
Otherwise, a new company will be created.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;companyId&#x60; | string | Yes | External company ID from your system (unique identifier) |
| &#x60;name&#x60; | string | Yes | Company name |
| &#x60;monthlySpend&#x60; | number | No | Monthly spend/revenue from this company |
| &#x60;industry&#x60; | string | No | Industry the company operates in |
| &#x60;website&#x60; | string | No | Company website URL |
| &#x60;plan&#x60; | string | No | Current plan/subscription name |
| &#x60;companySize&#x60; | number | No | Number of employees |
| &#x60;createdAt&#x60; | string | No | When the company was created (ISO 8601) |
| &#x60;customFields&#x60; | object | No | Custom field values |

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;companyId&quot;: &quot;comp_12345&quot;,
  &quot;name&quot;: &quot;Acme Inc&quot;,
  &quot;monthlySpend&quot;: 5000,
  &quot;industry&quot;: &quot;Technology&quot;,
  &quot;website&quot;: &quot;https://acme.com&quot;,
  &quot;plan&quot;: &quot;enterprise&quot;,
  &quot;companySize&quot;: 250,
  &quot;customFields&quot;: {
    &quot;region&quot;: &quot;EMEA&quot;,
    &quot;tier&quot;: &quot;gold&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;company&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;companyId&quot;: &quot;comp_12345&quot;,
  &quot;name&quot;: &quot;Acme Inc&quot;,
  &quot;monthlySpend&quot;: 5000,
  &quot;industry&quot;: &quot;Technology&quot;,
  &quot;website&quot;: &quot;https://acme.com&quot;,
  &quot;plan&quot;: &quot;enterprise&quot;,
  &quot;linkedUsers&quot;: 1,
  &quot;companySize&quot;: 250,
  &quot;lastActivity&quot;: &quot;2025-01-15T00:00:00.000Z&quot;,
  &quot;customFields&quot;: { &quot;region&quot;: &quot;EMEA&quot;, &quot;tier&quot;: &quot;gold&quot; },
  &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Error Responses

- **400 Bad Request** - Invalid company data

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpsertCompanyBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Company,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid company data`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/companies/:id',
		alias: 'getCompanyById',
		description: `Retrieves a single company by its Featurebase ID.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the company (MongoDB ObjectId)

### Response

Returns a company object with:
- &#x60;id&#x60; - Featurebase internal ID
- &#x60;companyId&#x60; - External company ID from your system
- &#x60;name&#x60; - Company name
- &#x60;monthlySpend&#x60; - Monthly spend/revenue
- &#x60;industry&#x60; - Industry
- &#x60;website&#x60; - Company website URL
- &#x60;plan&#x60; - Plan/tier name
- &#x60;linkedUsers&#x60; - Number of users linked to this company
- &#x60;companySize&#x60; - Employee headcount
- &#x60;lastActivity&#x60; - Last activity timestamp
- &#x60;customFields&#x60; - Custom field values
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;company&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;companyId&quot;: &quot;comp_12345&quot;,
  &quot;name&quot;: &quot;Acme Inc&quot;,
  &quot;monthlySpend&quot;: 5000,
  &quot;industry&quot;: &quot;Technology&quot;,
  &quot;website&quot;: &quot;https://acme.com&quot;,
  &quot;plan&quot;: &quot;enterprise&quot;,
  &quot;linkedUsers&quot;: 15,
  &quot;companySize&quot;: 250,
  &quot;lastActivity&quot;: &quot;2025-01-15T00:00:00.000Z&quot;,
  &quot;customFields&quot;: { &quot;location&quot;: &quot;Europe&quot; },
  &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-10T15:30:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Company with the specified ID does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Company,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The company ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('company_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/companies/:id',
		alias: 'deleteCompanyById',
		description: `Deletes a company by its Featurebase ID.

This will also remove the company from all linked users&#x27; associations.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the company (MongoDB ObjectId)

### Response

Returns a deletion confirmation object:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;company&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Company with the specified ID does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedCompany,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The company ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('company_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/companies/:id/contacts',
		alias: 'listCompanyContacts',
		description: `Returns all contacts (customers) attached to a specific company.

Only returns contacts with type &quot;customer&quot; that have the company in their &#x60;companyIds&#x60; array.
Uses cursor-based pagination.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the company (MongoDB ObjectId)

### Query Parameters

- &#x60;limit&#x60; - Number of contacts to return (1-100, default: 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response for pagination

### Response Structure

The response includes:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of contact objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;contact&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;userId&quot;: &quot;usr_12345&quot;,
      &quot;email&quot;: &quot;john@acme.com&quot;,
      &quot;name&quot;: &quot;John Doe&quot;,
      &quot;type&quot;: &quot;customer&quot;,
      &quot;companies&quot;: [...],
      &quot;createdAt&quot;: &quot;2025-01-01T12:00:00.000Z&quot;
    }
  ],
  &quot;nextCursor&quot;: &quot;eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9&quot;
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Company with the specified ID does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: ContactList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The company ID format is invalid
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_cursor']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('company_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/companies/:id/contacts',
		alias: 'attachContactToCompany',
		description: `Attaches a contact (customer) to a company.

Adds the company to the contact&#x27;s &#x60;companyIds&#x60; array and embedded &#x60;companies&#x60; array.
This operation is **additive** - existing company associations are preserved.
Also increments the &#x60;linkedUsers&#x60; count on the company.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the company (MongoDB ObjectId)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;contactId&#x60; | string | Yes | The Featurebase internal ID of the contact to attach (MongoDB ObjectId) |

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;contactId&quot;: &quot;507f1f77bcf86cd799439012&quot;
}
&#x60;&#x60;&#x60;

### Response

Returns the updated contact object with the new company association.

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439012&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@acme.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;type&quot;: &quot;customer&quot;,
  &quot;companies&quot;: [
    {
      &quot;object&quot;: &quot;company&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;companyId&quot;: &quot;comp_12345&quot;,
      &quot;name&quot;: &quot;Acme Inc&quot;
    }
  ]
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Company or contact does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ contactId: z.string() }).passthrough(),
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Contact.and(z.object({}).partial().passthrough()),
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The company or contact ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this ID
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['company_not_found', 'contact_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/companies/:id/contacts/:contactId',
		alias: 'removeContactFromCompany',
		description: `Removes a contact (customer) from a company.

Removes the company from the contact&#x27;s &#x60;companyIds&#x60; array and embedded &#x60;companies&#x60; array.
Also decrements the &#x60;linkedUsers&#x60; count on the company.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the company (MongoDB ObjectId)
- &#x60;contactId&#x60; - The Featurebase internal ID of the contact to remove (MongoDB ObjectId)

### Response

Returns the updated contact object with the company removed.

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439012&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@acme.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;type&quot;: &quot;customer&quot;,
  &quot;companies&quot;: []
}
&#x60;&#x60;&#x60;

### Error Responses

- **400 Bad Request** - Contact is not attached to this company
- **404 Not Found** - Company or contact does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
			{
				name: 'contactId',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Contact.and(z.object({}).partial().passthrough()),
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The company or contact ID format is invalid
- &#x60;contact_not_attached&#x60;: Contact is not attached to this company`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'contact_not_attached']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this ID
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['company_not_found', 'contact_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/companies/by-company-id/:companyId',
		alias: 'deleteCompanyByCompanyId',
		description: `Permanently deletes a company by its external company ID (the &#x60;companyId&#x60; from your system).

This will also remove the company from all linked users&#x27; associations.

### Path Parameters

- &#x60;companyId&#x60; - The external company ID from your system

### Deletion Behavior

When a company is deleted:
- The company record is permanently removed
- The company is removed from all linked users&#x27; &#x60;companyIds&#x60; and &#x60;companies&#x60; arrays

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The Featurebase internal ID of the deleted company
- &#x60;object&#x60; - Always &quot;company&quot;
- &#x60;deleted&#x60; - Always &#x60;true&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;company&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Use Case

Use this endpoint when you need to delete a company using your own system&#x27;s company identifier,
such as when a company is removed from your application.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'companyId',
				type: 'Path',
				schema: z.string().min(1).max(255),
			},
		],
		response: DeletedCompany,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;company_not_found&#x60;: No company exists with this external company ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('company_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/contacts',
		alias: 'listContacts',
		description: `Returns a list of contacts (customers and leads) in your organization using cursor-based pagination.

### Query Parameters

- &#x60;limit&#x60; - Number of contacts to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor from previous response for pagination
- &#x60;contactType&#x60; - Filter by contact type: &quot;customer&quot; (default), &quot;lead&quot;, or &quot;all&quot;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of contact objects
- &#x60;nextCursor&#x60; - Cursor for the next page, or null if no more results

### Contact Object

Each contact includes:
- &#x60;id&#x60; - Unique contact identifier
- &#x60;userId&#x60; - External user ID from SSO (if set)
- &#x60;email&#x60; - Contact email address
- &#x60;name&#x60; - Contact display name
- &#x60;profilePicture&#x60; - Profile picture URL
- &#x60;type&#x60; - Contact type (&quot;customer&quot; or &quot;lead&quot;)
- &#x60;companies&#x60; - Array of companies the contact belongs to
- &#x60;customFields&#x60; - Custom field values
- &#x60;postsCreated&#x60; - Number of posts created
- &#x60;commentsCreated&#x60; - Number of comments created
- &#x60;lastActivity&#x60; - Last activity timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;contact&quot;,
      &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
      &quot;email&quot;: &quot;john@example.com&quot;,
      &quot;name&quot;: &quot;John Doe&quot;,
      &quot;type&quot;: &quot;customer&quot;,
      ...
    }
  ],
  &quot;nextCursor&quot;: &quot;eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'contactType',
				type: 'Query',
				schema: z.enum(['customer', 'lead', 'all']).optional().default('customer'),
			},
		],
		response: ContactList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/contacts',
		alias: 'upsertContact',
		description: `Creates a new contact or updates an existing one.

If a contact with the given &#x60;email&#x60; or &#x60;userId&#x60; already exists, it will be updated.
Otherwise, a new contact will be created.

**At least one of &#x60;email&#x60; or &#x60;userId&#x60; must be provided for identification.**

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;email&#x60; | string | One of email/userId | Contact email address |
| &#x60;userId&#x60; | string | One of email/userId | External user ID from your system |
| &#x60;name&#x60; | string | No | Contact display name |
| &#x60;profilePicture&#x60; | string | No | Profile picture URL |
| &#x60;companies&#x60; | array | No | Companies the contact belongs to |
| &#x60;customFields&#x60; | object | No | Custom field values |
| &#x60;subscribedToChangelog&#x60; | boolean | No | Whether subscribed to changelog |
| &#x60;locale&#x60; | string | No | Contact locale/language |
| &#x60;phone&#x60; | string | No | Contact phone number |
| &#x60;roles&#x60; | array | No | Role IDs to assign |
| &#x60;userHash&#x60; | string | No | HMAC hash for identity verification |
| &#x60;createdAt&#x60; | string | No | When the contact was created (ISO 8601) |

### Company Object

Each company in the &#x60;companies&#x60; array can have:
- &#x60;id&#x60; (required) - External company ID from your system
- &#x60;name&#x60; (required) - Company name
- &#x60;monthlySpend&#x60; - Monthly spend/revenue
- &#x60;customFields&#x60; - Custom field values
- &#x60;industry&#x60; - Industry
- &#x60;website&#x60; - Company website URL
- &#x60;plan&#x60; - Current plan/subscription
- &#x60;companySize&#x60; - Number of employees
- &#x60;createdAt&#x60; - When the company was created

### Response

Returns the created or updated contact object.

- **201 Created** - A new contact was created
- **200 OK** - An existing contact was updated

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;companies&quot;: [
    {
      &quot;id&quot;: &quot;company_123&quot;,
      &quot;name&quot;: &quot;Acme Inc&quot;,
      &quot;monthlySpend&quot;: 500,
      &quot;plan&quot;: &quot;enterprise&quot;
    }
  ],
  &quot;customFields&quot;: {
    &quot;plan&quot;: &quot;pro&quot;,
    &quot;signupSource&quot;: &quot;website&quot;
  },
  &quot;subscribedToChangelog&quot;: true
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact&quot;,
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;type&quot;: &quot;customer&quot;,
  &quot;companies&quot;: [...],
  &quot;customFields&quot;: {...},
  ...
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpsertContactBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Contact.and(z.object({}).partial().passthrough()),
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;missing_parameter&#x60;: Either email or userId must be provided
- &#x60;invalid_request&#x60;: Invalid contact identification parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['missing_parameter', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/contacts/:id',
		alias: 'getContactById',
		description: `Retrieves a single contact by their Featurebase ID.

Returns both customers and leads.

### Path Parameters

- &#x60;id&#x60; - The Featurebase contact ID (24-character ObjectId)

### Response Format

Returns a single contact object with:
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;id&#x60; - Unique contact identifier
- &#x60;userId&#x60; - External user ID from SSO (if set)
- &#x60;email&#x60; - Contact email address
- &#x60;name&#x60; - Contact display name
- &#x60;profilePicture&#x60; - Profile picture URL
- &#x60;type&#x60; - Contact type (&quot;customer&quot; or &quot;lead&quot;)
- &#x60;companies&#x60; - Array of companies the contact belongs to
- &#x60;customFields&#x60; - Custom field values
- &#x60;postsCreated&#x60; - Number of posts created
- &#x60;commentsCreated&#x60; - Number of comments created
- &#x60;lastActivity&#x60; - Last activity timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact&quot;,
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;type&quot;: &quot;customer&quot;,
  ...
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Contact.and(z.object({}).partial().passthrough()),
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/contacts/:id',
		alias: 'deleteContactById',
		description: `Permanently deletes a contact by their Featurebase ID.

Supports deleting both customers and leads.

### Path Parameters

- &#x60;id&#x60; - The Featurebase contact ID (24-character ObjectId)

### Deletion Behavior

When a contact is deleted:
- The contact record is permanently removed
- Associated data cleanup is triggered asynchronously
- Comments and posts created by the contact are handled according to retention policies

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The ID of the deleted contact
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;deleted&#x60; - Always &#x60;true&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;object&quot;: &quot;contact&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedContact,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/contacts/:id/block',
		alias: 'blockContactById',
		description: `Blocks a contact by their Featurebase ID from the messenger/inbox.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the contact (MongoDB ObjectId)

### Supported Contact Types

This endpoint blocks both:
- **Customers** - Users with registered accounts
- **Leads** - Anonymous or unregistered visitors

### Blocking Behavior

When a contact is blocked:
- The contact cannot send new messages via messenger
- Existing conversations are not deleted but no new messages can be added by the blocked user
- The block can be removed by unblocking the contact

### Response

Returns a block confirmation object:
- &#x60;id&#x60; - The ID of the blocked contact
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;blocked&#x60; - Always &#x60;true&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;contact&quot;,
  &quot;blocked&quot;: true
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: BlockedContact,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/contacts/:id/email-preferences',
		alias: 'getContactEmailPreferencesById',
		description: `Retrieves the email preference state for a customer contact by their Featurebase ID.

**Important:** This endpoint only supports customer contacts. Leads do not have a customer email preference surface in the public API.

### Path Parameters

- &#x60;id&#x60; - The Featurebase contact ID (24-character ObjectId)

### Response Format

Returns a contact email preferences object with:
- &#x60;object&#x60; - Always &quot;contact_email_preferences&quot;
- &#x60;contactId&#x60; - Featurebase contact ID
- &#x60;userId&#x60; - External user ID, if available
- &#x60;email&#x60; - Contact email address, if available
- &#x60;preferences&#x60; - Current email preference state

### Preference Semantics

Each preference includes:
- &#x60;status&#x60; - The stored preference state for that category
- &#x60;effectiveStatus&#x60; - The final state after applying the global &#x60;all&#x60; preference override

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact_email_preferences&quot;,
  &quot;contactId&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;preferences&quot;: {
    &quot;all&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;postUpdates&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;postComments&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;commentReplies&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;changelog&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    }
  }
}
&#x60;&#x60;&#x60;`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: ContactEmailPreferencesOutput,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid
- &#x60;invalid_request&#x60;: The contact exists but is not a customer`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No customer contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/contacts/:id/email-preferences',
		alias: 'updateContactEmailPreferencesById',
		description: `Updates one or more email preferences for a customer contact by their Featurebase ID.

**Important:** This endpoint only supports customer contacts. Leads do not have a customer email preference surface in the public API.

### Path Parameters

- &#x60;id&#x60; - The Featurebase contact ID (24-character ObjectId)

### Request Body

- &#x60;preferences&#x60; - A partial map of preference keys to their desired stored status. Only the preferences included in the request are updated; any preferences omitted are left unchanged. At least one preference must be provided.

### Supported Preference Keys

- &#x60;all&#x60; - Master delivery gate. When &#x60;unsubscribed&#x60;, the contact will not receive any emails regardless of the per-category values. Per-category values are still persisted, so flipping &#x60;all&#x60; back to &#x60;subscribed&#x60; restores the contact&#x27;s previous granular preferences.
- &#x60;postUpdates&#x60; - Status changes and updates on posts the contact interacts with.
- &#x60;postComments&#x60; - New comments on posts the contact follows.
- &#x60;commentReplies&#x60; - Replies to the contact&#x27;s own comments.
- &#x60;changelog&#x60; - New changelog releases.

### Per-key Values

- &#x60;subscribed&#x60; - The contact will receive this email category (subject to the &#x60;all&#x60; gate).
- &#x60;unsubscribed&#x60; - The contact will not receive this email category.

### Combining &#x60;all&#x60; with per-category keys

You can send &#x60;all&#x60; together with any per-category keys in the same request. The full map is applied atomically as the contact&#x27;s new stored state — there is no implicit reset of the other keys. This makes the endpoint safe for preference-center UIs that POST the entire form state on submit.

The computed per-category result (after applying the &#x60;all&#x60; gate) is surfaced as &#x60;effectiveStatus&#x60; in the response, while &#x60;status&#x60; reflects the value actually stored for that key.

### Example Request (partial update)

&#x60;&#x60;&#x60;json
{
  &quot;preferences&quot;: {
    &quot;postUpdates&quot;: &quot;unsubscribed&quot;,
    &quot;changelog&quot;: &quot;subscribed&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Request (full preference-center submit)

&#x60;&#x60;&#x60;json
{
  &quot;preferences&quot;: {
    &quot;all&quot;: &quot;subscribed&quot;,
    &quot;postUpdates&quot;: &quot;subscribed&quot;,
    &quot;postComments&quot;: &quot;unsubscribed&quot;,
    &quot;commentReplies&quot;: &quot;unsubscribed&quot;,
    &quot;changelog&quot;: &quot;unsubscribed&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact_email_preferences&quot;,
  &quot;contactId&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;preferences&quot;: {
    &quot;all&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;subscribed&quot;
    },
    &quot;postUpdates&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;subscribed&quot;
    },
    &quot;postComments&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;commentReplies&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;changelog&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    }
  }
}
&#x60;&#x60;&#x60;`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateContactEmailPreferenceBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: ContactEmailPreferencesOutput,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid
- &#x60;invalid_request&#x60;: The contact exists but is not a customer`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: This preference change is not allowed for the contact`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No customer contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/contacts/:id/unblock',
		alias: 'unblockContactById',
		description: `Unblocks a contact by their Featurebase ID from the messenger/inbox.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the contact (MongoDB ObjectId)

### Supported Contact Types

This endpoint unblocks both:
- **Customers** - Users with registered accounts
- **Leads** - Anonymous or unregistered visitors

### Unblocking Behavior

When a contact is unblocked:
- The contact can resume sending messages via messenger
- Previously blocked conversations remain intact
- The contact regains full messenger functionality

### Response

Returns an unblock confirmation object:
- &#x60;id&#x60; - The ID of the unblocked contact
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;unblocked&#x60; - Always &#x60;true&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;contact&quot;,
  &quot;unblocked&quot;: true
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: UnblockedContact,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The contact ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/contacts/by-user-id/:userId',
		alias: 'getContactByUserId',
		description: `Retrieves a single contact by their external user ID (from your system via SSO).

**Important:** This endpoint only returns customers (type: &quot;customer&quot;). Leads are not returned.

### Path Parameters

- &#x60;userId&#x60; - The external user ID from your system (matched via SSO integration)

### Response Format

Returns a single contact object with:
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;id&#x60; - Unique contact identifier
- &#x60;userId&#x60; - External user ID from SSO
- &#x60;email&#x60; - Contact email address
- &#x60;name&#x60; - Contact display name
- &#x60;profilePicture&#x60; - Profile picture URL
- &#x60;type&#x60; - Always &quot;customer&quot; for this endpoint
- &#x60;companies&#x60; - Array of companies the contact belongs to
- &#x60;customFields&#x60; - Custom field values
- &#x60;postsCreated&#x60; - Number of posts created
- &#x60;commentsCreated&#x60; - Number of comments created
- &#x60;lastActivity&#x60; - Last activity timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact&quot;,
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;name&quot;: &quot;John Doe&quot;,
  &quot;type&quot;: &quot;customer&quot;,
  ...
}
&#x60;&#x60;&#x60;

### Use Case

This endpoint is useful when you need to look up a contact using your own system&#x27;s user identifier, 
such as when displaying Featurebase data alongside your user&#x27;s information in your own application.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().max(255),
			},
		],
		response: Contact.and(z.object({}).partial().passthrough()),
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this user ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/contacts/by-user-id/:userId',
		alias: 'deleteContactByUserId',
		description: `Permanently deletes a contact by their external user ID.

**Important:** This endpoint only deletes customers (type: &quot;customer&quot;). Leads cannot be deleted using this endpoint.

### Path Parameters

- &#x60;userId&#x60; - The external user ID from your system

### Deletion Behavior

When a contact is deleted:
- The contact record is permanently removed
- Associated data cleanup is triggered asynchronously
- Comments and posts created by the contact are handled according to retention policies

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The ID of the deleted contact
- &#x60;object&#x60; - Always &quot;contact&quot;
- &#x60;deleted&#x60; - Always &#x60;true&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;object&quot;: &quot;contact&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Use Case

Use this endpoint when you need to delete a contact using your own system&#x27;s user identifier,
such as when a user deletes their account in your application.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().max(255),
			},
		],
		response: DeletedContact,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Contact is not a customer`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No contact exists with this user ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/contacts/by-user-id/:userId/email-preferences',
		alias: 'getContactEmailPreferencesByUserId',
		description: `Retrieves the email preference state for a customer contact by their external user ID.

This endpoint only supports customer contacts and mirrors the existing &#x60;by-user-id&#x60; lookup pattern used across the contact API.

### Path Parameters

- &#x60;userId&#x60; - The external user ID from your system

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact_email_preferences&quot;,
  &quot;contactId&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;preferences&quot;: {
    &quot;all&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;postUpdates&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;postComments&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;commentReplies&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;changelog&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    }
  }
}
&#x60;&#x60;&#x60;`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().max(255),
			},
		],
		response: ContactEmailPreferencesOutput,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No customer contact exists with this user ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/contacts/by-user-id/:userId/email-preferences',
		alias: 'updateContactEmailPreferencesByUserId',
		description: `Updates one or more email preferences for a customer contact by their external user ID.

This endpoint only supports customer contacts and mirrors the existing &#x60;by-user-id&#x60; lookup pattern used across the contact API.

### Path Parameters

- &#x60;userId&#x60; - The external user ID from your system

### Request Body

- &#x60;preferences&#x60; - A partial map of preference keys to their desired stored status. Only the preferences included in the request are updated; any preferences omitted are left unchanged. At least one preference must be provided.

See &#x60;PATCH /v2/contacts/{id}/email-preferences&#x60; for the full list of supported preference keys and per-key values, the &#x60;all&#x60; delivery-gate semantics, and details on combining &#x60;all&#x60; with per-category keys in a single request.

### Example Request (partial update)

&#x60;&#x60;&#x60;json
{
  &quot;preferences&quot;: {
    &quot;postUpdates&quot;: &quot;unsubscribed&quot;,
    &quot;changelog&quot;: &quot;subscribed&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Request (full preference-center submit)

&#x60;&#x60;&#x60;json
{
  &quot;preferences&quot;: {
    &quot;all&quot;: &quot;subscribed&quot;,
    &quot;postUpdates&quot;: &quot;subscribed&quot;,
    &quot;postComments&quot;: &quot;unsubscribed&quot;,
    &quot;commentReplies&quot;: &quot;unsubscribed&quot;,
    &quot;changelog&quot;: &quot;unsubscribed&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;contact_email_preferences&quot;,
  &quot;contactId&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;userId&quot;: &quot;usr_12345&quot;,
  &quot;email&quot;: &quot;john@example.com&quot;,
  &quot;preferences&quot;: {
    &quot;all&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;subscribed&quot;
    },
    &quot;postUpdates&quot;: {
      &quot;status&quot;: &quot;subscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;subscribed&quot;
    },
    &quot;postComments&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;commentReplies&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    },
    &quot;changelog&quot;: {
      &quot;status&quot;: &quot;unsubscribed&quot;,
      &quot;effectiveStatus&quot;: &quot;unsubscribed&quot;
    }
  }
}
&#x60;&#x60;&#x60;`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateContactEmailPreferenceBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'userId',
				type: 'Path',
				schema: z.string().max(255),
			},
		],
		response: ContactEmailPreferencesOutput,
		errors: [
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: This preference change is not allowed for the contact`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: No customer contact exists with this user ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('contact_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/conversations',
		alias: 'listConversations',
		description: `Returns a list of conversations in your organization using cursor-based pagination.

### Query Parameters

- &#x60;limit&#x60; - Number of conversations to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor from previous response for pagination
- &#x60;tagIds&#x60; - Optional tag filter as a comma-separated list of tag IDs. Matches conversations that contain all of the provided tags.

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of conversation objects
- &#x60;nextCursor&#x60; - Cursor for the next page, or null if no more results

### Conversation Object

Each conversation includes:
- &#x60;id&#x60; - Unique conversation identifier (short ID)
- &#x60;title&#x60; - Conversation title
- &#x60;state&#x60; - Current state (&quot;open&quot;, &quot;closed&quot;, or &quot;snoozed&quot;)
- &#x60;priority&#x60; - Whether the conversation is marked as priority
- &#x60;adminAssigneeId&#x60; - ID of assigned admin (if any)
- &#x60;teamAssigneeId&#x60; - ID of assigned team (if any)
- &#x60;tags&#x60; - Current tags applied anywhere in the conversation
- &#x60;participants&#x60; - Array of participants
- &#x60;source&#x60; - Information about the first message
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;conversation&quot;,
      &quot;id&quot;: &quot;12345&quot;,
      &quot;title&quot;: &quot;Question about pricing&quot;,
      &quot;state&quot;: &quot;open&quot;,
      &quot;priority&quot;: false,
      &quot;adminAssigneeId&quot;: null,
      &quot;participants&quot;: [
        { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot; }
      ],
      ...
    }
  ],
  &quot;nextCursor&quot;: &quot;eyJpZCI6IjEyMzQ1In0&#x3D;&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'tagIds',
				type: 'Query',
				schema: boardId,
			},
		],
		response: ConversationList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/conversations',
		alias: 'createConversation',
		description: `Creates a new conversation. Supports both contact-initiated (customer/lead) and admin-initiated (outreach) conversations.

## Contact-Initiated Conversation

For conversations started by a customer or lead:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;from.type&#x60; | string | Yes | Must be &quot;contact&quot; |
| &#x60;from.id&#x60; | string | Yes | The Featurebase contact ID (24-character ObjectId) |
| &#x60;bodyMarkdown&#x60; | string | Yes | The initial message content in markdown format. Images referenced by URL or as base64 data URIs will be automatically uploaded and stored. |
| &#x60;channel&#x60; | string | No | The channel: &quot;desktop&quot; (default) or &quot;email&quot; |
| &#x60;createdAt&#x60; | string | No | ISO timestamp for migrations |

### Example Contact-Initiated Request

&#x60;&#x60;&#x60;json
{
  &quot;from&quot;: {
    &quot;type&quot;: &quot;contact&quot;,
    &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;
  },
  &quot;bodyMarkdown&quot;: &quot;Hello, I have a question about your product.&quot;,
  &quot;channel&quot;: &quot;desktop&quot;
}
&#x60;&#x60;&#x60;

## Admin-Initiated Outreach

For outreach conversations started by an admin:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;from.type&#x60; | string | Yes | Must be &quot;admin&quot; |
| &#x60;from.id&#x60; | string | Yes | The Featurebase admin ID (24-character ObjectId) |
| &#x60;bodyMarkdown&#x60; | string | Yes | The initial message content in markdown format. Images referenced by URL or as base64 data URIs will be automatically uploaded and stored. |
| &#x60;channel&#x60; | string | No | The channel: &quot;desktop&quot; (default) or &quot;email&quot; |
| &#x60;recipients&#x60; | object | Yes | Recipients for the outreach |
| &#x60;recipients.to&#x60; | object | Yes | Primary recipients |
| &#x60;recipients.to.emails&#x60; | string[] | No* | Email addresses |
| &#x60;recipients.to.ids&#x60; | string[] | No* | Featurebase contact IDs |
| &#x60;recipients.cc&#x60; | object | No | CC recipients (same structure as &quot;to&quot;) |
| &#x60;recipients.bcc&#x60; | object | No | BCC recipients (same structure as &quot;to&quot;) |
| &#x60;subject&#x60; | string | No** | Email subject line |
| &#x60;createdAt&#x60; | string | No | ISO timestamp for migrations |

*At least one email or ID is required in &#x60;recipients.to&#x60;
**Required when channel is &quot;email&quot;

### Example Admin Outreach (In-App)

&#x60;&#x60;&#x60;json
{
  &quot;from&quot;: {
    &quot;type&quot;: &quot;admin&quot;,
    &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;
  },
  &quot;bodyMarkdown&quot;: &quot;Hi! Just following up on your inquiry.&quot;,
  &quot;channel&quot;: &quot;desktop&quot;,
  &quot;recipients&quot;: {
    &quot;to&quot;: {
      &quot;ids&quot;: [&quot;676f0f6765bdaa7d7d760f88&quot;]
    }
  }
}
&#x60;&#x60;&#x60;

### Example Admin Outreach (Email)

&#x60;&#x60;&#x60;json
{
  &quot;from&quot;: {
    &quot;type&quot;: &quot;admin&quot;,
    &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;
  },
  &quot;bodyMarkdown&quot;: &quot;Hi! Just following up on your inquiry.&quot;,
  &quot;channel&quot;: &quot;email&quot;,
  &quot;subject&quot;: &quot;Following up on your inquiry&quot;,
  &quot;recipients&quot;: {
    &quot;to&quot;: {
      &quot;emails&quot;: [&quot;john@example.com&quot;]
    },
    &quot;cc&quot;: {
      &quot;emails&quot;: [&quot;manager@example.com&quot;]
    }
  }
}
&#x60;&#x60;&#x60;

### Response

Returns the created conversation object with a **201 Created** status.

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;id&quot;: &quot;12345&quot;,
  &quot;state&quot;: &quot;open&quot;,
  &quot;priority&quot;: false,
  &quot;adminAssigneeId&quot;: null,
  &quot;participants&quot;: [
    { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot; }
  ],
  &quot;source&quot;: {
    &quot;channel&quot;: &quot;desktop&quot;,
    &quot;deliveredAs&quot;: &quot;customer_initiated&quot;,
    &quot;bodyHtml&quot;: &quot;&lt;p&gt;Hello, I have a question about your product.&lt;/p&gt;&quot;,
    &quot;bodyMarkdown&quot;: &quot;Hello, I have a question about your product.&quot;,
    &quot;author&quot;: { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot; }
  },
  &quot;createdAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateConversationBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_content&#x60;: Invalid message content format
- &#x60;missing_parameter&#x60;: Required field is missing
- &#x60;invalid_parameter&#x60;: Invalid channel parameter
- &#x60;business_validation_error&#x60;: At least one recipient is required for admin outreach`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_content', 'missing_parameter', 'invalid_parameter', 'business_validation_error']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: Admin is not a member of this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;contact_not_found&#x60;: The contact initiating the conversation was not found
- &#x60;admin_not_found&#x60;: The admin initiating the outreach was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['contact_not_found', 'admin_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/conversations/:id',
		alias: 'getConversationById',
		description: `Retrieves a single conversation by its ID, including conversation parts (messages).

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Hard Limit of 500 Parts

The maximum number of conversation parts that can be returned via the API is **500**.
If a conversation has more than 500 parts, only the **500 most recent** conversation parts will be returned.

### Response Format

Returns a single conversation object with:
- &#x60;object&#x60; - Always &quot;conversation&quot;
- &#x60;id&#x60; - Unique conversation identifier (short ID)
- &#x60;title&#x60; - Conversation title
- &#x60;state&#x60; - Current state (&quot;open&quot;, &quot;closed&quot;, or &quot;snoozed&quot;)
- &#x60;priority&#x60; - Whether the conversation is marked as priority
- &#x60;adminAssigneeId&#x60; - ID of assigned admin (if any)
- &#x60;teamAssigneeId&#x60; - ID of assigned team (if any)
- &#x60;participants&#x60; - Array of participants
- &#x60;source&#x60; - Information about the first message
- &#x60;conversationParts&#x60; - Array of conversation parts (messages, max 500)
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Conversation Parts

Each conversation part includes:
- &#x60;object&#x60; - Always &quot;conversation_part&quot;
- &#x60;id&#x60; - Unique part identifier
- &#x60;partType&#x60; - Type of part (e.g., &quot;user_msg&quot;, &quot;admin_msg&quot;, &quot;bot_msg&quot;)
- &#x60;body&#x60; - Message body (HTML content)
- &#x60;author&#x60; - Author information with name, email, and profile picture
- &#x60;channel&#x60; - Channel through which the message was sent
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;id&quot;: &quot;12345&quot;,
  &quot;title&quot;: &quot;Question about pricing&quot;,
  &quot;state&quot;: &quot;open&quot;,
  &quot;priority&quot;: false,
  &quot;adminAssigneeId&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;participants&quot;: [
    { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot; }
  ],
  &quot;conversationParts&quot;: [
    {
      &quot;object&quot;: &quot;conversation_part&quot;,
      &quot;id&quot;: &quot;1&quot;,
      &quot;partType&quot;: &quot;user_msg&quot;,
      &quot;bodyHtml&quot;: &quot;&lt;p&gt;Hello, I have a question about your pricing plans.&lt;/p&gt;&quot;,
      &quot;bodyMarkdown&quot;: &quot;Hello, I have a question about your pricing plans.&quot;,
      &quot;author&quot;: {
        &quot;type&quot;: &quot;customer&quot;,
        &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
        &quot;name&quot;: &quot;John Doe&quot;,
        &quot;email&quot;: &quot;john@example.com&quot;
      },
      &quot;channel&quot;: &quot;desktop&quot;,
      &quot;createdAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;,
      &quot;updatedAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;
    },
    {
      &quot;object&quot;: &quot;conversation_part&quot;,
      &quot;id&quot;: &quot;2&quot;,
      &quot;partType&quot;: &quot;admin_msg&quot;,
      &quot;bodyHtml&quot;: &quot;&lt;p&gt;Hi John! I&#x27;d be happy to help you with pricing information.&lt;/p&gt;&quot;,
      &quot;bodyMarkdown&quot;: &quot;Hi John! I&#x27;d be happy to help you with pricing information.&quot;,
      &quot;author&quot;: {
        &quot;type&quot;: &quot;admin&quot;,
        &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
        &quot;name&quot;: &quot;Support Agent&quot;
      },
      &quot;channel&quot;: &quot;desktop&quot;,
      &quot;createdAt&quot;: &quot;2025-01-15T10:35:00.000Z&quot;,
      &quot;updatedAt&quot;: &quot;2025-01-15T10:35:00.000Z&quot;
    }
  ],
  &quot;createdAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-15T10:35:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('conversation_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/conversations/:id',
		alias: 'deleteConversation',
		description: `Permanently deletes a conversation by its short ID.

### Path Parameters

- &#x60;id&#x60; - The conversation short ID (numeric)

### Response

Returns a deletion confirmation object:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;12345&quot;,
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Caution

This operation is **irreversible**. The conversation and all its messages will be permanently deleted.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: DeletedConversation,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('conversation_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/conversations/:id',
		alias: 'updateConversation',
		description: `Updates a conversation&#x27;s properties. Supports partial updates - only provided fields will be updated.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| &#x60;actingAdminId&#x60; | string | Admin ID performing the action (for attribution). If not provided, uses bot service user. Must be a member of the organization. |
| &#x60;state&#x60; | string | Conversation state: &quot;open&quot;, &quot;closed&quot;, or &quot;snoozed&quot; |
| &#x60;snoozedUntil&#x60; | string | ISO datetime when to unsnooze (required when state is &quot;snoozed&quot;) |
| &#x60;adminAssigneeId&#x60; | string/null | Admin ID to assign, or null to unassign |
| &#x60;teamAssigneeId&#x60; | string/null | Team ID to assign, or null to unassign |
| &#x60;title&#x60; | string | Conversation title |
| &#x60;customAttributes&#x60; | object | Custom attributes to set on the conversation |
| &#x60;markAsRead&#x60; | object | Mark conversation as read for specific users |

### markAsRead Object

| Field | Type | Description |
|-------|------|-------------|
| &#x60;allAdmins&#x60; | boolean | If true, marks all admins with existing readReceipts as read |
| &#x60;adminIds&#x60; | string[] | Array of specific admin IDs to mark as read |
| &#x60;allContacts&#x60; | boolean | If true, marks all contacts with existing readReceipts as read |
| &#x60;contactIds&#x60; | string[] | Array of specific contact IDs to mark as read |

Note: Only users with existing read receipts will be updated. Use &#x60;allAdmins&#x60;/&#x60;allContacts&#x60; OR &#x60;adminIds&#x60;/&#x60;contactIds&#x60; - the &quot;all&quot; flags take precedence.

### Response

Returns the updated conversation object.

### Example: Close a Conversation (with attribution)

&#x60;&#x60;&#x60;json
{
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;state&quot;: &quot;closed&quot;
}
&#x60;&#x60;&#x60;

### Example: Close a Conversation (bot user)

&#x60;&#x60;&#x60;json
{
  &quot;state&quot;: &quot;closed&quot;
}
&#x60;&#x60;&#x60;

### Example: Snooze a Conversation

&#x60;&#x60;&#x60;json
{
  &quot;state&quot;: &quot;snoozed&quot;,
  &quot;snoozedUntil&quot;: &quot;2025-01-20T10:00:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Example: Assign to an Admin

&#x60;&#x60;&#x60;json
{
  &quot;adminAssigneeId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Example: Update Title and Custom Attributes

&#x60;&#x60;&#x60;json
{
  &quot;title&quot;: &quot;Billing Issue - Priority&quot;,
  &quot;customAttributes&quot;: {
    &quot;priority_level&quot;: &quot;high&quot;,
    &quot;category&quot;: &quot;billing&quot;
  }
}
&#x60;&#x60;&#x60;

### Example: Mark as Read (All Admins)

&#x60;&#x60;&#x60;json
{
  &quot;markAsRead&quot;: {
    &quot;allAdmins&quot;: true
  }
}
&#x60;&#x60;&#x60;

### Example: Mark as Read (All Contacts)

&#x60;&#x60;&#x60;json
{
  &quot;markAsRead&quot;: {
    &quot;allContacts&quot;: true
  }
}
&#x60;&#x60;&#x60;

### Example: Mark as Read (Specific IDs)

&#x60;&#x60;&#x60;json
{
  &quot;markAsRead&quot;: {
    &quot;adminIds&quot;: [&quot;507f1f77bcf86cd799439011&quot;],
    &quot;contactIds&quot;: [&quot;676f0f6765bdaa7d7d760f88&quot;]
  }
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateConversationBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid update parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: Acting admin is not a member of this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;admin_not_found&#x60;: The acting admin was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'admin_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/conversations/:id/participants',
		alias: 'addParticipantToConversation',
		description: `Adds a contact (customer or lead) as a participant to an existing conversation.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;participant&#x60; | object | Yes | The contact to add (see below) |
| &#x60;participant.id&#x60; | string | No* | The Featurebase ID (24-character ObjectId) - matches customer or lead |
| &#x60;participant.userId&#x60; | string | No* | External user ID from your system - matches customer only |
| &#x60;participant.email&#x60; | string | No* | Email address - matches customer only |
| &#x60;actingAdminId&#x60; | string | No | Admin ID performing the action (for attribution) |

*At least one of &#x60;id&#x60;, &#x60;userId&#x60;, or &#x60;email&#x60; is required in the participant object.

### Lookup Priority

1. If &#x60;id&#x60; is provided, looks up by Featurebase ID (matches both customer and lead types)
2. If &#x60;userId&#x60; is provided, looks up by external user ID (matches customer type only)
3. If &#x60;email&#x60; is provided, looks up by email address (matches customer type only)

### Response

Returns the updated conversation object.

### Example Request (by Featurebase ID)

&#x60;&#x60;&#x60;json
{
  &quot;participant&quot;: {
    &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;
  },
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Example Request (by external userId)

&#x60;&#x60;&#x60;json
{
  &quot;participant&quot;: {
    &quot;userId&quot;: &quot;user_123&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Request (by email)

&#x60;&#x60;&#x60;json
{
  &quot;participant&quot;: {
    &quot;email&quot;: &quot;john@example.com&quot;
  }
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;id&quot;: &quot;12345&quot;,
  &quot;participants&quot;: [
    { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot; },
    { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f89&quot; }
  ],
  ...
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AddParticipantBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: Acting admin is not a member of this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;contact_not_found&#x60;: The contact to add was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'contact_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/conversations/:id/participants',
		alias: 'removeParticipantFromConversation',
		description: `Removes a contact (customer or lead) from an existing conversation.

**Note:** You cannot remove the last participant from a conversation.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;id&#x60; | string | Yes | The Featurebase ID of the contact to remove (24-character ObjectId) |
| &#x60;actingAdminId&#x60; | string | No | Admin ID performing the action (for attribution) |

### Response

Returns the updated conversation object.

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;id&quot;: &quot;12345&quot;,
  &quot;participants&quot;: [
    { &quot;type&quot;: &quot;customer&quot;, &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f89&quot; }
  ],
  ...
}
&#x60;&#x60;&#x60;

### Error Cases

- **400 Bad Request** - Cannot remove the last participant from a conversation
- **404 Not Found** - Conversation or contact not found in participants

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RemoveParticipantBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Cannot remove the last participant from a conversation`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: Acting admin is not a member of this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;participant_not_found&#x60;: The contact is not a participant in this conversation`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'participant_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/conversations/:id/reply',
		alias: 'replyToConversation',
		description: `Adds a reply to an existing conversation. Supports both contact (customer/lead) and admin replies.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Request Body

The request body varies based on who is sending the reply:

#### Contact Reply (customer/lead)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;type&#x60; | string | Yes | Must be &quot;contact&quot; |
| &#x60;userId&#x60; | string | No* | External user ID from your system |
| &#x60;id&#x60; | string | No* | Featurebase contact ID (24-character ObjectId) |
| &#x60;bodyMarkdown&#x60; | string | Yes | The message content in markdown format. Images referenced by URL or as base64 data URIs will be automatically uploaded and stored. |
| &#x60;messageType&#x60; | string | Yes | Must be &quot;reply&quot; |
| &#x60;skipNotifications&#x60; | boolean | No | Skip sending notifications (default: false). Useful for bulk imports. |

*At least one of &#x60;userId&#x60; or &#x60;id&#x60; is required.

#### Admin Reply

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;type&#x60; | string | Yes | Must be &quot;admin&quot; |
| &#x60;id&#x60; | string | Yes | Featurebase admin ID (24-character ObjectId) |
| &#x60;bodyMarkdown&#x60; | string | Yes | The message content in markdown format. Images referenced by URL or as base64 data URIs will be automatically uploaded and stored. |
| &#x60;messageType&#x60; | string | Yes | &quot;reply&quot; for customer-visible reply, &quot;note&quot; for internal note |
| &#x60;skipNotifications&#x60; | boolean | No | Skip sending notifications (default: false). Useful for bulk imports. |

### Response

Returns the created conversation part object with a **201 Created** status. The response includes both &#x60;bodyHtml&#x60; (with signed image URLs) and &#x60;bodyMarkdown&#x60; fields.

### Example Contact Reply

&#x60;&#x60;&#x60;json
{
  &quot;type&quot;: &quot;contact&quot;,
  &quot;userId&quot;: &quot;user_123&quot;,
  &quot;bodyMarkdown&quot;: &quot;Thank you for your help!&quot;,
  &quot;messageType&quot;: &quot;reply&quot;
}
&#x60;&#x60;&#x60;

### Example Admin Reply

&#x60;&#x60;&#x60;json
{
  &quot;type&quot;: &quot;admin&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;bodyMarkdown&quot;: &quot;I&#x27;m happy to help! Here&#x27;s what you need to do...&quot;,
  &quot;messageType&quot;: &quot;reply&quot;
}
&#x60;&#x60;&#x60;

### Example Admin Note (Internal)

&#x60;&#x60;&#x60;json
{
  &quot;type&quot;: &quot;admin&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;bodyMarkdown&quot;: &quot;Customer seems frustrated, escalating to tier 2.&quot;,
  &quot;messageType&quot;: &quot;note&quot;
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation_part&quot;,
  &quot;id&quot;: &quot;3&quot;,
  &quot;partType&quot;: &quot;user_msg&quot;,
  &quot;bodyHtml&quot;: &quot;&lt;p&gt;Thank you for your help!&lt;/p&gt;&quot;,
  &quot;bodyMarkdown&quot;: &quot;Thank you for your help!&quot;,
  &quot;author&quot;: {
    &quot;type&quot;: &quot;customer&quot;,
    &quot;id&quot;: &quot;676f0f6765bdaa7d7d760f88&quot;,
    &quot;name&quot;: &quot;John Doe&quot;,
    &quot;email&quot;: &quot;john@example.com&quot;
  },
  &quot;channel&quot;: &quot;desktop&quot;,
  &quot;createdAt&quot;: &quot;2025-01-15T10:40:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-15T10:40:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: ReplyToConversationBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: ConversationPart,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_content&#x60;: Invalid message content format
- &#x60;missing_parameter&#x60;: Required field is missing (userId or id)
- &#x60;invalid_parameter&#x60;: Invalid channel parameter
- &#x60;invalid_request&#x60;: Invalid reply type`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_content', 'missing_parameter', 'invalid_parameter', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;contact_not_found&#x60;: The contact sending the reply was not found
- &#x60;admin_not_found&#x60;: The admin sending the reply was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'contact_not_found', 'admin_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/conversations/:id/tags',
		alias: 'attachConversationTag',
		description: `Attaches a workspace tag to a conversation.

This endpoint requires both the tag ID to attach and the &#x60;actingAdminId&#x60; of the admin on whose behalf the mutation is recorded.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;tagId&#x60; | string | Yes | The Featurebase tag ID to attach |
| &#x60;actingAdminId&#x60; | string | Yes | The admin performing the mutation. Must be a member of the organization. |

### Behavior

Featurebase resolves the latest taggable reply/message in the conversation and records the tag attachment against that part so audit metadata remains deterministic.

### Response

Returns the affected tag plus attachment metadata such as &#x60;targetPartId&#x60;, &#x60;appliedAt&#x60;, and &#x60;appliedBy&#x60;.

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;tagId&quot;: &quot;67ec1234abcd5678ef901234&quot;,
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AttachConversationTagBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: AttachedConversationTag,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid tag mutation request, including malformed IDs, archived tags, or a non-taggable target message`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;resource_not_found&#x60;: No tag, admin, or eligible target message exists for this request`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'resource_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/conversations/:id/tags/:tagId',
		alias: 'detachConversationTag',
		description: `Removes a workspace tag from a conversation.

This endpoint requires the &#x60;actingAdminId&#x60; of the admin on whose behalf the mutation is recorded.

### Path Parameters

- &#x60;id&#x60; - The conversation ID (short ID)
- &#x60;tagId&#x60; - The Featurebase tag ID to remove

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;actingAdminId&#x60; | string | Yes | The admin performing the mutation. Must be a member of the organization. |

### Behavior

Featurebase resolves the latest taggable reply/message in the conversation and records the tag removal against that part so audit metadata remains deterministic.

### Response

Returns the affected tag payload with the most relevant attachment metadata available for that relationship.

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ actingAdminId: z.string() }).passthrough(),
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
			{
				name: 'tagId',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: AttachedConversationTag,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid tag mutation request, including malformed IDs, archived tags, or a non-taggable target message`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;resource_not_found&#x60;: No tag, admin, or eligible target message exists for this request`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'resource_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/conversations/redact',
		alias: 'redactConversationPart',
		description: `Redacts a conversation part (message) from a conversation. Redaction permanently removes the message content while preserving the conversation structure.

Only human message types can be redacted:
- &#x60;user_msg&#x60; - Messages from customers/leads
- &#x60;admin_msg&#x60; - Messages from admins
- &#x60;email_msg&#x60; - Email messages
- &#x60;bot_msg&#x60; - Bot messages

System-generated conversation parts (assignments, status changes, etc.) cannot be redacted.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;type&#x60; | string | Yes | The type of item to redact. Currently only &#x60;&quot;conversation_part&quot;&#x60; is supported. |
| &#x60;conversationId&#x60; | string | Yes | The conversation short ID containing the part to redact |
| &#x60;conversationPartId&#x60; | string | Yes | The conversation part short ID to redact |
| &#x60;actingAdminId&#x60; | string | No | Admin ID performing the action (for attribution) |

### Response

Returns the updated conversation object.

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;type&quot;: &quot;conversation_part&quot;,
  &quot;conversationId&quot;: &quot;12345&quot;,
  &quot;conversationPartId&quot;: &quot;67890&quot;,
  &quot;actingAdminId&quot;: &quot;507f1f77bcf86cd799439011&quot;
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;conversation&quot;,
  &quot;id&quot;: &quot;12345&quot;,
  &quot;conversationParts&quot;: [
    {
      &quot;object&quot;: &quot;conversation_part&quot;,
      &quot;id&quot;: &quot;67890&quot;,
      &quot;partType&quot;: &quot;user_msg&quot;,
      &quot;bodyHtml&quot;: &quot;&quot;,
      &quot;bodyMarkdown&quot;: &quot;&quot;,
      &quot;redacted&quot;: true,
      ...
    }
  ],
  ...
}
&#x60;&#x60;&#x60;

### Error Cases

- **400 Bad Request** - Only human messages can be redacted
- **404 Not Found** - Conversation or conversation part not found

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RedactConversationPartBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Conversation,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Only human messages can be redacted`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;: Acting admin is not a member of this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;conversation_not_found&#x60;: No conversation exists with this ID
- &#x60;conversation_part_not_found&#x60;: The conversation part was not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['conversation_not_found', 'conversation_part_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/custom_fields',
		alias: 'listCustomFields',
		description: `Returns all custom fields configured in your organization.

This endpoint returns all custom fields at once (typically a small list). No pagination is supported.

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of custom field objects
- &#x60;nextCursor&#x60; - Always null

### Custom Field Object

Each custom field includes:
- &#x60;id&#x60; - Unique field identifier
- &#x60;label&#x60; - Field label displayed to users
- &#x60;type&#x60; - Field type (text, number, select, multi-select, checkbox, date)
- &#x60;required&#x60; - Whether the field is required
- &#x60;placeholder&#x60; - Placeholder text (for text/number fields)
- &#x60;public&#x60; - Whether the field value is publicly visible
- &#x60;internal&#x60; - Whether the field is for internal use only
- &#x60;options&#x60; - Array of options (for select/multi-select fields)

### Field Types

- &#x60;text&#x60; - Single line text input
- &#x60;number&#x60; - Numeric input
- &#x60;select&#x60; - Single-choice dropdown
- &#x60;multi-select&#x60; - Multiple-choice dropdown
- &#x60;checkbox&#x60; - Boolean checkbox
- &#x60;date&#x60; - Date picker`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: CustomFieldList,
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/custom_fields/:id',
		alias: 'getCustomField',
		description: `Retrieves a single custom field by its unique identifier.

Returns the custom field object if found in your organization.

### Response

Returns a custom field object with:
- &#x60;id&#x60; - Unique field identifier
- &#x60;label&#x60; - Field label displayed to users
- &#x60;type&#x60; - Field type (text, number, select, multi-select, checkbox, date)
- &#x60;required&#x60; - Whether the field is required
- &#x60;placeholder&#x60; - Placeholder text (for text/number fields)
- &#x60;public&#x60; - Whether the field value is publicly visible
- &#x60;internal&#x60; - Whether the field is for internal use only
- &#x60;options&#x60; - Array of options (for select/multi-select fields)

### Errors

- &#x60;404&#x60; - Custom field not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: CustomField,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The custom field ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;custom_field_not_found&#x60;: No custom field exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('custom_field_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/articles',
		alias: 'listArticles',
		description: `Returns a paginated list of articles within your organization&#x27;s help center.

Articles are the main content pieces that contain documentation, guides, and FAQs.

### Query Parameters

- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination
- &#x60;state&#x60; - Filter by article state: &quot;live&quot;, &quot;draft&quot;, or &quot;all&quot; (default &quot;live&quot;)
- &#x60;parentId&#x60; - Filter by parent collection ID

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of article objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Article Object

Each article includes:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Article title
- &#x60;description&#x60; - Article description
- &#x60;body&#x60; - Article content (HTML)
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Article icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID
- &#x60;helpCenterId&#x60; - ID of the help center this article belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;state&#x60; - Article state (live or draft)
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;publishedLocales&#x60; - Array of locales where article is published
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the article
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;author&#x60; - Author information (name, authorId, avatarUrl)
- &#x60;order&#x60; - Display order
- &#x60;isPublished&#x60; - Whether the article is published
- &#x60;isDraftDiffersFromLive&#x60; - Whether draft differs from live version
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated
- &#x60;liveUpdatedAt&#x60; - ISO 8601 timestamp when live version was last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'state',
				type: 'Query',
				schema: z.enum(['live', 'draft', 'all']).optional().default('live'),
			},
			{
				name: 'parentId',
				type: 'Query',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/)
					.optional(),
			},
			{
				name: 'helpCenterId',
				type: 'Query',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/)
					.optional(),
			},
		],
		response: ArticleList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/help_center/articles',
		alias: 'createArticle',
		description: `Creates a new article in your organization&#x27;s help center.

### Request Body

Required attributes:
- &#x60;title&#x60; - The title of the article

Optional attributes:
- &#x60;description&#x60; - A brief description of the article
- &#x60;body&#x60; - The HTML content of the article (supports external image URLs and base64 data URIs)
- &#x60;formatter&#x60; - Content formatter: &quot;default&quot; or &quot;ai&quot; (AI converts markdown/html to Featurebase format)
- &#x60;parentId&#x60; - The ID of the parent collection
- &#x60;icon&#x60; - Icon object with type and value
- &#x60;state&#x60; - &quot;live&quot; or &quot;draft&quot; (defaults to &quot;draft&quot;)
- &#x60;translations&#x60; - Dictionary of translations keyed by locale

### Response

Returns the created article object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Article title
- &#x60;description&#x60; - Article description
- &#x60;body&#x60; - Article content (HTML)
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Article icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID
- &#x60;helpCenterId&#x60; - ID of the help center this article belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;state&#x60; - Article state (live or draft)
- &#x60;author&#x60; - Author information (name, authorId, avatarUrl)
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateArticleBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Article,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid article data`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/articles/:id',
		alias: 'getArticle',
		description: `Retrieves a specific article by its unique identifier.

Returns the article object if found in your organization&#x27;s help center.

### Query Parameters

- &#x60;state&#x60; - Article state to retrieve: &quot;live&quot; or &quot;draft&quot; (default &quot;live&quot;)

### Response

Returns an article object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Article title
- &#x60;description&#x60; - Article description
- &#x60;body&#x60; - Article content (HTML)
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Article icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID
- &#x60;helpCenterId&#x60; - ID of the help center this article belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;state&#x60; - Article state (live or draft)
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;publishedLocales&#x60; - Array of locales where article is published
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the article
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;author&#x60; - Author information (name, authorId, avatarUrl)
- &#x60;order&#x60; - Display order
- &#x60;isPublished&#x60; - Whether the article is published
- &#x60;isDraftDiffersFromLive&#x60; - Whether draft differs from live version
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated
- &#x60;liveUpdatedAt&#x60; - ISO 8601 timestamp when live version was last updated

### Errors

- &#x60;404&#x60; - Article not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
			{
				name: 'state',
				type: 'Query',
				schema: z.enum(['live', 'draft']).optional().default('live'),
			},
		],
		response: Article,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The article ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;article_not_found&#x60;: No article exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('article_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/help_center/articles/:id',
		alias: 'updateArticle',
		description: `Updates an existing article. Only include the fields you wish to update.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the article to update

### Request Body

All fields are optional. Only provided fields will be updated:
- &#x60;title&#x60; - The new title of the article
- &#x60;description&#x60; - The new description of the article
- &#x60;body&#x60; - The new HTML content of the article
- &#x60;formatter&#x60; - Content formatter: &quot;default&quot; or &quot;ai&quot;
- &#x60;icon&#x60; - Updated icon object for the article
- &#x60;parentId&#x60; - New parent collection ID
- &#x60;authorId&#x60; - ID of the new author (must be a member of the organization)
- &#x60;state&#x60; - &quot;live&quot; or &quot;draft&quot; - if &quot;live&quot;, publishes immediately
- &#x60;translations&#x60; - Dictionary of updated translations keyed by locale

### Response

Returns the updated article object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Article title
- &#x60;description&#x60; - Article description
- &#x60;body&#x60; - Article content (HTML)
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Article icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID
- &#x60;helpCenterId&#x60; - ID of the help center this article belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;state&#x60; - Article state (live or draft)
- &#x60;author&#x60; - Author information (name, authorId, avatarUrl)
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;404&#x60; - Article not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateArticleBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Article,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The article ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;article_not_found&#x60;: No article exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('article_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/help_center/articles/:id',
		alias: 'deleteArticle',
		description: `Deletes an existing article.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the article to delete

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The ID of the deleted article
- &#x60;object&#x60; - Always &quot;article&quot;
- &#x60;deleted&#x60; - Always true

### Errors

- &#x60;404&#x60; - Article not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: DeletedArticle,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The article ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;article_not_found&#x60;: No article exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('article_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/collections',
		alias: 'listCollections',
		description: `Returns a paginated list of collections within your organization&#x27;s help center.

Collections are used to organize articles into logical groups.

### Query Parameters

- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of collection objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Collection Object

Each collection includes:
- &#x60;id&#x60; - Unique identifier
- &#x60;name&#x60; - Collection name
- &#x60;description&#x60; - Collection description
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Collection icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID (null for root collections)
- &#x60;helpCenterId&#x60; - ID of the help center this collection belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the collection
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;articleCount&#x60; - Number of articles in this collection
- &#x60;authorCount&#x60; - Number of authors who contributed
- &#x60;order&#x60; - Display order
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'helpCenterId',
				type: 'Query',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/)
					.optional(),
			},
		],
		response: CollectionList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/help_center/collections',
		alias: 'createCollection',
		description: `Creates a new collection in your organization&#x27;s help center.

### Request Body

Required attributes:
- &#x60;name&#x60; - The name of the collection

Optional attributes:
- &#x60;description&#x60; - A description of the collection
- &#x60;icon&#x60; - An icon object representing the collection icon (with type and value)
- &#x60;parentId&#x60; - The ID of the parent collection, if any
- &#x60;translations&#x60; - A dictionary of translations keyed by locale

### Response

Returns the created collection object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;name&#x60; - Collection name
- &#x60;description&#x60; - Collection description
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Collection icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID (null for root collections)
- &#x60;helpCenterId&#x60; - ID of the help center this collection belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the collection
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;articleCount&#x60; - Number of articles in this collection
- &#x60;authorCount&#x60; - Number of authors who contributed
- &#x60;order&#x60; - Display order
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateCollectionBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Collection,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid collection data`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/collections/:id',
		alias: 'getCollection',
		description: `Retrieves a specific collection by its unique identifier.

Returns the collection object if found in your organization&#x27;s help center.

### Response

Returns a collection object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;name&#x60; - Collection name
- &#x60;description&#x60; - Collection description
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Collection icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID (null for root collections)
- &#x60;helpCenterId&#x60; - ID of the help center this collection belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the collection
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;articleCount&#x60; - Number of articles in this collection
- &#x60;authorCount&#x60; - Number of authors who contributed
- &#x60;order&#x60; - Display order
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;404&#x60; - Collection not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Collection,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The collection ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;collection_not_found&#x60;: No collection exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('collection_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/help_center/collections/:id',
		alias: 'updateCollection',
		description: `Updates an existing collection. Only include the fields you wish to update.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the collection to update

### Request Body

All fields are optional. Only provided fields will be updated:
- &#x60;name&#x60; - The new name of the collection
- &#x60;description&#x60; - The new description of the collection
- &#x60;icon&#x60; - An updated icon object for the collection (with type and value)
- &#x60;parentId&#x60; - The new parent collection ID, if applicable (null for root level)
- &#x60;translations&#x60; - A dictionary of updated translations keyed by locale code

### Response

Returns the updated collection object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;name&#x60; - Collection name
- &#x60;description&#x60; - Collection description
- &#x60;slug&#x60; - URL slug
- &#x60;icon&#x60; - Collection icon (emoji or custom)
- &#x60;parentId&#x60; - Parent collection ID (null for root collections)
- &#x60;helpCenterId&#x60; - ID of the help center this collection belongs to
- &#x60;organization&#x60; - Organization ID
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;featurebaseUrl&#x60; - Featurebase URL for the collection
- &#x60;externalUrl&#x60; - External URL if custom domain is configured
- &#x60;articleCount&#x60; - Number of articles in this collection
- &#x60;authorCount&#x60; - Number of authors who contributed
- &#x60;order&#x60; - Display order
- &#x60;translations&#x60; - Translations for different locales
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;404&#x60; - Collection not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateCollectionBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: Collection,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The collection ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;collection_not_found&#x60;: No collection exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('collection_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/help_center/collections/:id',
		alias: 'deleteCollection',
		description: `Deletes an existing collection.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the collection to delete

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The ID of the deleted collection
- &#x60;object&#x60; - Always &quot;collection&quot;
- &#x60;deleted&#x60; - Always true

### Errors

- &#x60;404&#x60; - Collection not found in your organization&#x27;s help center`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: DeletedCollection,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The collection ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;collection_not_found&#x60;: No collection exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('collection_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/help_centers',
		alias: 'listHelpCenters',
		description: `Returns all help centers configured in your Featurebase organization.

Currently, Featurebase only supports one help center per organization, but we plan on supporting multiple help centers in the future.

### Query Parameters

- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of help center objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Help Center Object

Each help center includes:
- &#x60;id&#x60; - Unique identifier
- &#x60;displayName&#x60; - Help center display name
- &#x60;title&#x60; - Help center title
- &#x60;description&#x60; - Help center description
- &#x60;isPublic&#x60; - Whether the help center is publicly accessible
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;navItems&#x60; - Navigation items configuration
- &#x60;urls&#x60; - URL configuration (subpath, custom domain)
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: HelpCenterList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/help_centers/:id',
		alias: 'getHelpCenter',
		description: `Retrieves a single help center by its unique identifier.

Returns the help center object if found in your organization.

### Response

Returns a help center object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;displayName&#x60; - Help center display name
- &#x60;title&#x60; - Help center title
- &#x60;description&#x60; - Help center description
- &#x60;searchPlaceholder&#x60; - Search input placeholder text
- &#x60;isPublic&#x60; - Whether the help center is publicly accessible
- &#x60;defaultLocale&#x60; - Default locale for content
- &#x60;locale&#x60; - Current locale
- &#x60;availableLocales&#x60; - Array of available locales
- &#x60;navItems&#x60; - Navigation items configuration
- &#x60;urls&#x60; - URL configuration (subpath, custom domain)
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;404&#x60; - Help center not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/),
			},
		],
		response: HelpCenter,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The help center ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;help_center_not_found&#x60;: No help center exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('help_center_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/redirect_rules',
		alias: 'listRedirectRules',
		description: `Returns a paginated list of redirect rules within your organization.

Redirect rules map old Help Center URLs to new article or collection destinations, enabling seamless migration from legacy help center systems. Only Help Centers with a custom domain configured support redirect rules.

### Query Parameters

- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination
- &#x60;helpCenterId&#x60; - Filter by help center ID
- &#x60;locale&#x60; - Filter by locale code
- &#x60;targetType&#x60; - Filter by target type (&quot;article&quot; or &quot;collection&quot;)

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of redirect rule objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Redirect Rule Object

Each redirect rule includes:
- &#x60;id&#x60; - Unique identifier (MongoDB ObjectId)
- &#x60;helpCenterId&#x60; - Help center this rule belongs to
- &#x60;locale&#x60; - Locale code used to resolve the target translation
- &#x60;fromUrl&#x60; - Canonical source URL (query/hash stripped, hostname lowercased)
- &#x60;targetType&#x60; - &quot;article&quot; or &quot;collection&quot;
- &#x60;targetId&#x60; - ID of the target article or collection
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'helpCenterId',
				type: 'Query',
				schema: z
					.string()
					.min(1)
					.max(16)
					.regex(/^[a-zA-Z0-9]+$/)
					.optional(),
			},
			{
				name: 'locale',
				type: 'Query',
				schema: z
					.enum([
						'bn',
						'bs',
						'pt-BR',
						'bg',
						'ca',
						'hr',
						'cs',
						'da',
						'nl',
						'en',
						'et',
						'fi',
						'fr',
						'de',
						'el',
						'hi',
						'hu',
						'id',
						'it',
						'ja',
						'ko',
						'lv',
						'lt',
						'ms',
						'mn',
						'nb',
						'pl',
						'pt',
						'ro',
						'ru',
						'sr',
						'zh-CN',
						'sk',
						'sl',
						'es',
						'sw',
						'sv',
						'th',
						'zh-TW',
						'tr',
						'uk',
						'vi',
					])
					.optional(),
			},
			{
				name: 'targetType',
				type: 'Query',
				schema: z.enum(['article', 'collection']).optional(),
			},
		],
		response: RedirectRuleList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/help_center/redirect_rules',
		alias: 'createRedirectRule',
		description: `Creates a new redirect rule in your organization.

The &#x60;fromUrl&#x60; is normalized on creation: query parameters and hash fragments are stripped, the hostname is lowercased, and trailing slashes are removed. The &#x60;fromUrl&#x60; hostname must match the Help Center&#x27;s configured custom domain.

The target article or collection must exist and have a resolvable URL (i.e., a published translation with a slug).

### Request Body

Required attributes:
- &#x60;helpCenterId&#x60; - The ID of the help center this rule belongs to
- &#x60;locale&#x60; - Locale code used to resolve the target translation
- &#x60;fromUrl&#x60; - The full absolute URL to redirect from (must match the help center&#x27;s custom domain)
- &#x60;targetType&#x60; - &quot;article&quot; or &quot;collection&quot;
- &#x60;targetId&#x60; - The ID of the target article or collection

### Response

Returns the created redirect rule object.

### Errors

- &#x60;400&#x60; - Invalid request data, fromUrl does not match custom domain, or target not found`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateRedirectRuleBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: RedirectRule,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid redirect rule data
- &#x60;business_validation_error&#x60;: fromUrl hostname does not match the Help Center custom domain, or a redirect rule already exists for this fromUrl
- &#x60;resource_not_found&#x60;: Target article or collection does not exist or has no resolvable URL`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_request', 'business_validation_error', 'resource_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/redirect_rules/:id',
		alias: 'getRedirectRule',
		description: `Retrieves a specific redirect rule by its unique identifier.

Returns the redirect rule object if found in your organization.

### Response

Returns a redirect rule object with:
- &#x60;id&#x60; - Unique identifier (MongoDB ObjectId)
- &#x60;helpCenterId&#x60; - Help center this rule belongs to
- &#x60;locale&#x60; - Locale code
- &#x60;fromUrl&#x60; - Canonical source URL being redirected from
- &#x60;targetType&#x60; - &quot;article&quot; or &quot;collection&quot;
- &#x60;targetId&#x60; - ID of the target article or collection
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;404&#x60; - Redirect rule not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: RedirectRule,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The redirect rule ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;redirect_rule_not_found&#x60;: No redirect rule exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('redirect_rule_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/help_center/redirect_rules/:id',
		alias: 'updateRedirectRule',
		description: `Updates an existing redirect rule. Only include the fields you wish to update.

If &#x60;fromUrl&#x60; is provided, it will be re-normalized and validated against the Help Center&#x27;s custom domain. If &#x60;targetType&#x60; or &#x60;targetId&#x60; is changed, the new target must exist and have a resolvable URL.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the redirect rule to update

### Request Body

All fields are optional. Only provided fields will be updated:
- &#x60;helpCenterId&#x60; - The help center ID
- &#x60;locale&#x60; - Locale code
- &#x60;fromUrl&#x60; - Updated source URL (will be re-normalized)
- &#x60;targetType&#x60; - &quot;article&quot; or &quot;collection&quot;
- &#x60;targetId&#x60; - ID of the new target article or collection

### Response

Returns the updated redirect rule object.

### Errors

- &#x60;404&#x60; - Redirect rule not found
- &#x60;400&#x60; - Invalid data, domain mismatch, duplicate fromUrl, or target not found`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateRedirectRuleBody_Nova,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: RedirectRule,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The redirect rule ID format is invalid
- &#x60;business_validation_error&#x60;: fromUrl hostname does not match the Help Center custom domain, or a redirect rule already exists for this fromUrl
- &#x60;resource_not_found&#x60;: Target article or collection does not exist or has no resolvable URL`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'business_validation_error', 'resource_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;redirect_rule_not_found&#x60;: No redirect rule exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('redirect_rule_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/help_center/redirect_rules/:id',
		alias: 'deleteRedirectRule',
		description: `Deletes an existing redirect rule. The associated Redis cache entry is also invalidated.

### Path Parameters

- &#x60;id&#x60; - The unique identifier of the redirect rule to delete

### Response

Returns a deletion confirmation object:
- &#x60;id&#x60; - The ID of the deleted redirect rule
- &#x60;object&#x60; - Always &quot;redirect_rule&quot;
- &#x60;deleted&#x60; - Always true

### Errors

- &#x60;404&#x60; - Redirect rule not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedRedirectRule,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The redirect rule ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;redirect_rule_not_found&#x60;: No redirect rule exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('redirect_rule_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/help_center/redirect_rules/by-url',
		alias: 'getRedirectRuleByUrl',
		description: `Retrieves a specific redirect rule by its source URL.

The &#x60;url&#x60; query parameter is normalized before matching: query parameters and hash fragments are stripped, the hostname is lowercased, and trailing slashes are removed. This is the same normalization applied when creating a redirect rule.

### Query Parameters

- &#x60;url&#x60; (required) - Full absolute URL to look up (http or https)

### Response

Returns a redirect rule object with:
- &#x60;id&#x60; - Unique identifier (MongoDB ObjectId)
- &#x60;helpCenterId&#x60; - Help center this rule belongs to
- &#x60;locale&#x60; - Locale code
- &#x60;fromUrl&#x60; - Canonical source URL being redirected from
- &#x60;targetType&#x60; - &quot;article&quot; or &quot;collection&quot;
- &#x60;targetId&#x60; - ID of the target article or collection
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Errors

- &#x60;400&#x60; - Invalid URL format
- &#x60;404&#x60; - No redirect rule exists for the given URL`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'url',
				type: 'Query',
				schema: z.string().max(2048),
			},
		],
		response: RedirectRule,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_parameter&#x60;: The URL format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_parameter'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;redirect_rule_not_found&#x60;: No redirect rule exists for the given URL`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('redirect_rule_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/post_statuses',
		alias: 'listPostStatuses',
		description: `Returns all post statuses for the authenticated organization.

Post statuses define workflow stages for posts. Each status has:
- A display name and color
- A type indicating the workflow stage (reviewing, unstarted, active, completed, canceled)
- A flag indicating if it&#x27;s the default status for new posts

This endpoint returns all post statuses without pagination. Organizations typically have a small number of statuses.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: z.array(PostStatus),
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/post_statuses/:id',
		alias: 'getPostStatus',
		description: `Retrieves a single post status by its unique identifier.

Returns the full post status object including name, color, type, and default flag.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: PostStatus,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The status ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: No post status exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/posts',
		alias: 'listPosts',
		description: `Returns all posts (feedback submissions) for the authenticated organization.

Posts are user-submitted feedback items. Each post belongs to a board and can have:
- Status (in progress, complete, etc.)
- Tags for categorization
- Upvotes from users
- Comments (if enabled)
- Custom field values

### Pagination

This endpoint uses **cursor-based pagination**:

- &#x60;limit&#x60; - Number of posts to return (1-100, default 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response&#x27;s &#x60;nextCursor&#x60; field

**Example:** To paginate through results:
1. First request: &#x60;GET /v2/posts?limit&#x3D;10&#x60;
2. If &#x60;nextCursor&#x60; is not null, use it for the next page
3. Next request: &#x60;GET /v2/posts?limit&#x3D;10&amp;cursor&#x3D;{nextCursor}&#x60;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of post objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Filtering

Filter posts using query parameters:
- &#x60;boardId&#x60; - Filter by board (category) ID
- &#x60;statusId&#x60; - Filter by status ID
- &#x60;tags&#x60; - Filter by tag names (can be comma-separated or repeated)
- &#x60;q&#x60; - Search query for title/content
- &#x60;inReview&#x60; - Include posts pending moderation

### Sorting

Use &#x60;sortBy&#x60; to sort results:
- &#x60;createdAt&#x60; - Sort by creation date (default)
- &#x60;upvotes&#x60; - Sort by vote count
- &#x60;trending&#x60; - Sort by trending score
- &#x60;recent&#x60; - Sort by most recently updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'boardId',
				type: 'Query',
				schema: boardId,
			},
			{
				name: 'statusId',
				type: 'Query',
				schema: boardId,
			},
			{
				name: 'tags',
				type: 'Query',
				schema: tags,
			},
			{
				name: 'q',
				type: 'Query',
				schema: z.string().max(255).optional(),
			},
			{
				name: 'inReview',
				type: 'Query',
				schema: inReview,
			},
			{
				name: 'sortBy',
				type: 'Query',
				schema: z.enum(['createdAt', 'upvotes', 'trending', 'recent']).optional().default('createdAt'),
			},
			{
				name: 'sortOrder',
				type: 'Query',
				schema: z.enum(['asc', 'desc']).optional().default('desc'),
			},
		],
		response: PostList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/posts',
		alias: 'createPost',
		description: `Creates a new post (feedback submission) in the specified board.

### Required Fields

- &#x60;title&#x60; - Post title (minimum 2 characters)
- &#x60;boardId&#x60; - Board ID to create the post in

### Optional Fields

- &#x60;content&#x60; - Post content in HTML format
- &#x60;tags&#x60; - Array of tag names to attach
- &#x60;statusId&#x60; - Status ID to set (defaults to board&#x27;s default status)
- &#x60;commentsEnabled&#x60; - Whether comments are allowed (default: true)
- &#x60;inReview&#x60; - Whether post is pending moderation (default: false)
- &#x60;customFields&#x60; - Custom field values as key-value pairs
- &#x60;eta&#x60; - Estimated completion date (Unix timestamp or ISO date)
- &#x60;assigneeId&#x60; - Admin ID to assign this post to
- &#x60;visibility&#x60; - Post-level visibility restriction: &#x27;public&#x27; (no additional restrictions), &#x27;authorOnly&#x27; (only author and admins), or &#x27;companyOnly&#x27; (only users in author&#x27;s company). Note: even &#x27;public&#x27; posts are still subject to board-level and organization-level access controls.

### Author Attribution

For posts created on behalf of users, use the &#x60;author&#x60; object:
- &#x60;id&#x60; - Featurebase user ID
- &#x60;userId&#x60; - External SSO user ID
- &#x60;email&#x60; - User&#x27;s email address
- &#x60;name&#x60; - Display name
- &#x60;profilePicture&#x60; - Profile picture URL

Resolution priority: &#x60;id&#x60; &gt; &#x60;userId&#x60; &gt; &#x60;email&#x60; &gt; authenticated user

### Backdating (Imports)

- &#x60;createdAt&#x60; - Override creation date for importing historical data

### Response

Returns the created post object with all fields populated.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreatePostBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Post,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid or missing required fields`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;board_not_found&#x60;: The specified boardId does not exist`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('board_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/posts/:id',
		alias: 'getPost',
		description: `Retrieves a single post by its unique identifier.

Returns the full post object including:
- Author information
- Current status
- Tags
- Voting stats
- Engagement metrics
- Custom field values`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Post,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/posts/:id',
		alias: 'updatePost',
		description: `Updates an existing post. Only provided fields will be modified.

### Updatable Fields

- &#x60;title&#x60; - Post title (minimum 2 characters)
- &#x60;content&#x60; - Post content in HTML format
- &#x60;boardId&#x60; - Move post to a different board
- &#x60;statusId&#x60; - Update post status
- &#x60;tags&#x60; - Replace existing tags with new set
- &#x60;commentsEnabled&#x60; - Enable/disable comments
- &#x60;inReview&#x60; - Put post in/out of moderation queue
- &#x60;customFields&#x60; - Update custom field values
- &#x60;eta&#x60; - Set estimated completion date (null to clear)
- &#x60;createdAt&#x60; - Update creation date (for backdating)
- &#x60;assigneeId&#x60; - Admin ID to assign this post to (null to unassign)
- &#x60;visibility&#x60; - Post-level visibility restriction: &#x27;public&#x27; (no additional restrictions), &#x27;authorOnly&#x27; (only author and admins), or &#x27;companyOnly&#x27; (only users in author&#x27;s company). Note: even &#x27;public&#x27; posts are still subject to board-level and organization-level access controls.
- &#x60;author&#x60; - Change post attribution (id, userId, email, name, profilePicture)

### Status Update Notifications

- &#x60;sendStatusUpdateEmail&#x60; - When changing status, optionally send email notification to voters (default: false)

### Response

Returns the updated post object with all fields populated.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdatePostBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Post,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid
- &#x60;invalid_request&#x60;: Invalid update parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/posts/:id',
		alias: 'deletePost',
		description: `Permanently deletes a post. This action cannot be undone.

### What Gets Deleted

When you delete a post:
- The post itself is permanently removed
- All comments on the post are deleted
- Vote records are removed
- Any associated notifications are cleared

### Response

Returns a deletion confirmation object with:
- &#x60;id&#x60; - The ID of the deleted post
- &#x60;object&#x60; - Always &quot;post&quot;
- &#x60;deleted&#x60; - Always true

### Permissions

Requires member-level access or higher to delete posts.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedPost,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/posts/:id/voters',
		alias: 'listVoters',
		description: `Returns all voters (upvoters) for a specific post.

Voters are users who have upvoted the post. Each voter is returned in the standard user format with:
- Basic info: id, name, email, profilePicture
- User type (admin, customer, guest, etc.)
- Companies the user belongs to
- Activity stats: commentsCreated, postsCreated, lastActivity
- Preferences: subscribedToChangelog, locale, verified

### Pagination

This endpoint uses **cursor-based pagination**:

- &#x60;limit&#x60; - Number of voters to return (1-100, default 10)
- &#x60;cursor&#x60; - Opaque cursor from a previous response&#x27;s &#x60;nextCursor&#x60; field

**Example:** To paginate through results:
1. First request: &#x60;GET /v2/posts/{id}/voters?limit&#x3D;10&#x60;
2. If &#x60;nextCursor&#x60; is not null, use it for the next page
3. Next request: &#x60;GET /v2/posts/{id}/voters?limit&#x3D;10&amp;cursor&#x3D;{nextCursor}&#x60;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of user objects
- &#x60;nextCursor&#x60; - Cursor for the next page (null if no more results)

### Permissions

Requires member-level access or higher.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: UserList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_cursor']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/posts/:id/voters',
		alias: 'addVoter',
		description: `Adds a voter (upvote) to a post.

### Voter Identification

To add a vote on behalf of a user, provide one or more identification fields:
- &#x60;id&#x60; - Featurebase user ID
- &#x60;userId&#x60; - External SSO user ID from your system
- &#x60;email&#x60; - User&#x27;s email address
- &#x60;name&#x60; - Display name (used when creating a new user)
- &#x60;profilePicture&#x60; - Profile picture URL (used when creating a new user)

Resolution priority: &#x60;id&#x60; &gt; &#x60;userId&#x60; &gt; &#x60;email&#x60; &gt; authenticated user

If no fields are provided, the authenticated user&#x27;s vote is added.

If the user doesn&#x27;t exist, a new customer will be created with the provided information.

### Idempotency

If the user has already voted on this post, the request succeeds but no duplicate vote is added.

### Response

Returns a confirmation object with:
- &#x60;object&#x60; - Always &quot;voter&quot;
- &#x60;added&#x60; - Always true
- &#x60;id&#x60; - The voter&#x27;s user ID
- &#x60;postId&#x60; - The post ID the vote was added to

### Permissions

Requires member-level access or higher.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: AddVoterBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: AddVoterResponse,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid
- &#x60;invalid_request&#x60;: Invalid voter identification parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('post_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/posts/:id/voters',
		alias: 'removeVoter',
		description: `Removes a voter (upvote) from a post.

### Voter Identification

To remove a vote on behalf of a user, provide one or more identification fields:
- &#x60;id&#x60; - Featurebase user ID
- &#x60;userId&#x60; - External SSO user ID from your system
- &#x60;email&#x60; - User&#x27;s email address

Resolution priority: &#x60;id&#x60; &gt; &#x60;userId&#x60; &gt; &#x60;email&#x60; &gt; authenticated user

If no fields are provided, the authenticated user&#x27;s vote will be removed.

### Response

Returns a confirmation object with:
- &#x60;object&#x60; - Always &quot;voter&quot;
- &#x60;removed&#x60; - Always true
- &#x60;id&#x60; - The voter&#x27;s user ID
- &#x60;postId&#x60; - The post ID the vote was removed from

### Permissions

Requires member-level access or higher.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: RemoveVoterBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: RemoveVoterResponse,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The post ID format is invalid
- &#x60;invalid_request&#x60;: Invalid voter identification parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;post_not_found&#x60;: No post exists with this ID
- &#x60;voter_not_found&#x60;: The user has not voted on this post`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['post_not_found', 'voter_not_found']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/surveys',
		alias: 'listSurveys',
		description: `Returns all surveys configured in your Featurebase organization.

### Query Parameters

- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination
- &#x60;type&#x60; - Filter by survey page type (text, link, rating, multiple-choice)
- &#x60;isActive&#x60; - Filter by active status

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of survey objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Survey Object

Each survey includes:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Survey title
- &#x60;description&#x60; - Survey description
- &#x60;isActive&#x60; - Whether the survey is active
- &#x60;responseCount&#x60; - Number of responses received
- &#x60;targeting&#x60; - Targeting configuration (segments, URLs, CSS selectors)
- &#x60;pages&#x60; - Array of survey pages/questions
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'type',
				type: 'Query',
				schema: z.enum(['text', 'link', 'rating', 'multiple-choice']).optional(),
			},
			{
				name: 'isActive',
				type: 'Query',
				schema: inReview,
			},
		],
		response: SurveyList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/surveys/:id',
		alias: 'getSurvey',
		description: `Retrieves a single survey by its unique identifier.

Returns the survey object if found in your organization.

### Response

Returns a survey object with:
- &#x60;id&#x60; - Unique identifier
- &#x60;title&#x60; - Survey title
- &#x60;description&#x60; - Survey description
- &#x60;isActive&#x60; - Whether the survey is active
- &#x60;responseCount&#x60; - Number of responses received
- &#x60;targeting&#x60; - Targeting configuration
- &#x60;pages&#x60; - Array of survey pages/questions
- &#x60;createdAt&#x60; - ISO 8601 timestamp when created
- &#x60;updatedAt&#x60; - ISO 8601 timestamp when last updated

### Survey Pages

Each page represents a question or screen in the survey:
- &#x60;type&#x60; - Page type (text, link, rating, multiple-choice)
- &#x60;title&#x60; - Question title
- &#x60;description&#x60; - Optional description
- &#x60;logic&#x60; - Conditional logic rules
- &#x60;defaultAction&#x60; - Default action when no logic matches

### Errors

- &#x60;404&#x60; - Survey not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Survey,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The survey ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;survey_not_found&#x60;: No survey exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('survey_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/surveys/:id/responses',
		alias: 'getSurveyResponses',
		description: `Retrieves all user responses for a specific survey.

### Query Parameters

- &#x60;pageId&#x60; - Filter responses to a specific survey page
- &#x60;limit&#x60; - Number of items to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor for pagination

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of survey response objects
- &#x60;nextCursor&#x60; - Cursor for next page (null if no more results)

### Survey Response Object

Each response includes:
- &#x60;id&#x60; - Unique response identifier
- &#x60;user&#x60; - User who submitted the response (may be null for anonymous)
- &#x60;responses&#x60; - Array of individual answers
- &#x60;createdAt&#x60; - ISO 8601 timestamp when submitted

### Individual Response

Each item in the responses array:
- &#x60;pageId&#x60; - The survey page this response is for
- &#x60;type&#x60; - Response type (text, rating, multiple-choice)
- &#x60;value&#x60; - The response value

### Errors

- &#x60;404&#x60; - Survey not found in your organization`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
			{
				name: 'pageId',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
		],
		response: SurveyResponseList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The survey ID format is invalid
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_id', 'invalid_cursor']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;survey_not_found&#x60;: No survey exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('survey_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tags',
		alias: 'listTags',
		description: `Returns the live conversation tags available in the workspace tag catalog. These are the canonical tags that power conversation payloads, filters, and tag mutation endpoints.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: TagList,
		errors: [
			{
				status: 401,
				description: `Unauthorized

Possible error codes:
- &#x60;organization_required&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authentication_error'),
								code: z.literal('organization_required'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(401),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/tags',
		alias: 'upsertTag',
		description: `Creates a new workspace conversation tag when only &#x60;name&#x60; is provided. If &#x60;id&#x60; is also provided, the existing tag is renamed instead.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpsertTagBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: ConversationTag,
		errors: [
			{
				status: 401,
				description: `Unauthorized

Possible error codes:
- &#x60;organization_required&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authentication_error'),
								code: z.literal('organization_required'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(401),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tags/:id',
		alias: 'getTagById',
		description: `Returns a single conversation tag by its Featurebase tag ID. Archived tags can still be retrieved directly by ID, while permanently deleted tags return &#x60;404&#x60;.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: ConversationTag,
		errors: [
			{
				status: 401,
				description: `Unauthorized

Possible error codes:
- &#x60;organization_required&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authentication_error'),
								code: z.literal('organization_required'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(401),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/tags/:id',
		alias: 'deleteTag',
		description: `Deletes a conversation tag from the workspace catalog and removes it from aggregate conversation tag state. Archived and historical part applications remain part of the audit trail where applicable.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: z.object({ actingAdminId: z.string() }).partial().passthrough().optional(),
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedTag,
		errors: [
			{
				status: 401,
				description: `Unauthorized

Possible error codes:
- &#x60;organization_required&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authentication_error'),
								code: z.literal('organization_required'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(401),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 403,
				description: `Forbidden

Possible error codes:
- &#x60;forbidden&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('authorization_error'),
								code: z.literal('forbidden'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(403),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/teams',
		alias: 'listTeams',
		description: `Returns all teams in your organization.

### Response Structure

The response includes:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of team objects

### Team Object

Each team includes:
- &#x60;id&#x60; - Unique team identifier
- &#x60;name&#x60; - Team display name
- &#x60;color&#x60; - Team color in hex format
- &#x60;icon&#x60; - Team icon (emoji, predefined, or external URL)
- &#x60;members&#x60; - Array of admin IDs who are members of this team

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;team&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;name&quot;: &quot;Support Team&quot;,
      &quot;color&quot;: &quot;#3B82F6&quot;,
      &quot;icon&quot;: {
        &quot;value&quot;: &quot;👥&quot;,
        &quot;type&quot;: &quot;emoji&quot;
      },
      &quot;members&quot;: [&quot;5fef50c5e9458a0012f82456&quot;, &quot;5fef50c5e9458a0012f82457&quot;]
    }
  ]
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: TeamList,
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/teams/:id',
		alias: 'getTeamById',
		description: `Retrieves a single team by its Featurebase ID.

### Path Parameters

- &#x60;id&#x60; - The Featurebase internal ID of the team (MongoDB ObjectId)

### Response

Returns a team object with:
- &#x60;id&#x60; - Unique team identifier
- &#x60;name&#x60; - Team display name
- &#x60;color&#x60; - Team color in hex format
- &#x60;icon&#x60; - Team icon (emoji, predefined, or external URL)
- &#x60;members&#x60; - Array of admin IDs who are members of this team

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;team&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;name&quot;: &quot;Support Team&quot;,
  &quot;color&quot;: &quot;#3B82F6&quot;,
  &quot;icon&quot;: {
    &quot;value&quot;: &quot;👥&quot;,
    &quot;type&quot;: &quot;emoji&quot;
  },
  &quot;members&quot;: [&quot;5fef50c5e9458a0012f82456&quot;, &quot;5fef50c5e9458a0012f82457&quot;]
}
&#x60;&#x60;&#x60;

### Error Responses

- **404 Not Found** - Team with the specified ID does not exist

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Team,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The team ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;team_not_found&#x60;: No team exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('team_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets',
		alias: 'listTickets',
		description: `Returns a list of tickets in your organization using cursor-based pagination.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| &#x60;limit&#x60; | number | Number of tickets to return (1-100, default 10) |
| &#x60;cursor&#x60; | string | Cursor from previous response for pagination |
| &#x60;ticketCategoryIds&#x60; | string[] | Filter by ticket category IDs |
| &#x60;statusIds&#x60; | string[] | Filter by status IDs |
| &#x60;q&#x60; | string | Search query |
| &#x60;assigneeId&#x60; | string | Filter by assignee ID |
| &#x60;categoryType&#x60; | string | Filter by category type: &quot;customer&quot;, &quot;tracker&quot;, or &quot;back-office&quot; |
| &#x60;sortBy&#x60; | string | Sort field: &quot;date&quot; (default), &quot;recent&quot;, or &quot;ticketNumber&quot; |
| &#x60;sortOrder&#x60; | string | Sort direction: &quot;asc&quot; or &quot;desc&quot; (default) |

### Response

Returns a list object with &#x60;data&#x60; (array of ticket objects) and &#x60;nextCursor&#x60;.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'ticketCategoryIds',
				type: 'Query',
				schema: z.array(z.string()).optional(),
			},
			{
				name: 'statusIds',
				type: 'Query',
				schema: z.array(z.string()).optional(),
			},
			{
				name: 'q',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'assigneeId',
				type: 'Query',
				schema: z.string().optional(),
			},
			{
				name: 'categoryType',
				type: 'Query',
				schema: z.enum(['customer', 'tracker', 'back-office']).optional(),
			},
			{
				name: 'sortBy',
				type: 'Query',
				schema: z.enum(['date', 'recent', 'ticketNumber']).optional().default('date'),
			},
			{
				name: 'sortOrder',
				type: 'Query',
				schema: z.enum(['asc', 'desc']).optional().default('desc'),
			},
		],
		response: TicketList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/tickets',
		alias: 'createTicket',
		description: `Creates a new ticket.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| &#x60;ticketCategoryId&#x60; | string | Ticket category ID |
| &#x60;title&#x60; | string | Ticket title (min 2 characters) |
| &#x60;author&#x60; | object | Author/contact info (id, userId, email, name, profilePicture) |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| &#x60;content&#x60; | string | Ticket description (HTML) |
| &#x60;customFields&#x60; | object | Custom field values |
| &#x60;companyId&#x60; | string | Company to associate |
| &#x60;linkedConversationId&#x60; | string | Conversation to link |
| &#x60;assigneeId&#x60; | string | Admin to assign |
| &#x60;statusId&#x60; | string | Initial status |
| &#x60;createdAt&#x60; | string | ISO 8601 timestamp for backdating |
| &#x60;skipNotifications&#x60; | boolean | Skip sending notifications (default false) |

### File Custom Fields

File-type custom fields can be provided in two ways:

**Method 1: Multipart upload** — Send the request as &#x60;multipart/form-data&#x60;. Put the JSON body in a field named &#x60;data&#x60;, and attach files with field names like &#x60;customFields.&lt;fieldId&gt;&#x60;. For &#x60;allowMultiple&#x60; fields, send multiple files with the same field name.

**Method 2: External URL** — In the JSON body, set the file custom field value to &#x60;{ &quot;url&quot;: &quot;https://...&quot; }&#x60;. Optionally include &#x60;&quot;name&quot;&#x60; to set the filename (e.g. &#x60;{ &quot;url&quot;: &quot;https://...&quot;, &quot;name&quot;: &quot;report.pdf&quot; }&#x60;); if omitted, the filename is extracted from the download response. For &#x60;allowMultiple&#x60; fields, use an array: &#x60;[{ &quot;url&quot;: &quot;...&quot; }, ...]&#x60;. The server downloads the file (max 10MB, HTTPS only) and stores it.

Both methods produce signed download URLs in the response.

**Limits:** Max 10 files per request, 400MB total upload size. Executable file types (.exe, .bat, .js, .sh, etc.) are blocked.

**Response format:** File custom field values in the response are JSON strings containing &#x60;{ &quot;key&quot;: &quot;...&quot;, &quot;name&quot;: &quot;...&quot;, &quot;url&quot;: &quot;https://signed-url...&quot; }&#x60;. For &#x60;allowMultiple&#x60; fields, an array of these objects. The &#x60;url&#x60; is a time-limited signed download URL (expires in 1 hour).

### Response

Returns the created ticket object with **201 Created** status.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: createTicket_Body,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Ticket,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid request parameters
- &#x60;missing_parameter&#x60;: Required field is missing`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_request', 'missing_parameter']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: Ticket category, assignee, or contact not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/:id',
		alias: 'getTicket',
		description: `Retrieves a single ticket by its ticket number.

### Path Parameters

- &#x60;id&#x60; - The ticket number (e.g. 42 from TK-42)

### Response

Returns the ticket object, including &#x60;conversationParts&#x60; from the linked conversation (message history).`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.number().int().gte(1),
			},
		],
		response: Ticket,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: No ticket exists with this number`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/tickets/:id',
		alias: 'updateTicket',
		description: `Updates a ticket&#x27;s properties. Only provided fields will be updated.

### Path Parameters

- &#x60;id&#x60; - The ticket number

### Request Body

All fields are optional.

| Field | Type | Description |
|-------|------|-------------|
| &#x60;title&#x60; | string | Update title |
| &#x60;content&#x60; | string | Update description (HTML) |
| &#x60;statusId&#x60; | string | Set status by ID |
| &#x60;open&#x60; | boolean | Close (false) or reopen (true) the ticket |
| &#x60;assigneeId&#x60; | string/null | Assign/unassign admin |
| &#x60;companyId&#x60; | string/null | Update company association |
| &#x60;customFields&#x60; | object | Update custom field values |
| &#x60;snoozedUntil&#x60; | string/null | Snooze until ISO 8601 timestamp (null to unsnooze) |
| &#x60;skipNotifications&#x60; | boolean | Skip notifications (default false) |

### Closing a Ticket

Set &#x60;open: false&#x60; to close the ticket. Closing a ticket will also unsnooze it. The status is not changed automatically — use &#x60;statusId&#x60; to change the status explicitly.

### File Custom Fields

File-type custom fields support the same two upload methods as ticket creation: multipart upload (&#x60;customFields.&lt;fieldId&gt;&#x60; file parts with JSON in the &#x60;data&#x60; field) and external URLs (&#x60;{ &quot;url&quot;: &quot;https://...&quot; }&#x60; with optional &#x60;&quot;name&quot;&#x60; in the custom field value). Same limits apply (10 files, 400MB total, executable types blocked).

### Response

Returns the updated ticket object.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: updateTicket_Body,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.number().int().gte(1),
			},
		],
		response: Ticket,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: Invalid update parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_request'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: Ticket or assignee not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/tickets/:id',
		alias: 'deleteTicket',
		description: `Permanently deletes a ticket by its ticket number.

### Path Parameters

- &#x60;id&#x60; - The ticket number

### Response

Returns a deletion confirmation:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;ticket&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Behavior

- **Customer-facing tickets**: Deletes the ticket and its linked conversation.
- **Back-office / tracker tickets**: Deletes the ticket and unlinks it from the conversation (conversation is preserved).

### Caution

This operation is **irreversible**.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.number().int().gte(1),
			},
		],
		response: DeletedTicket,
		errors: [
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: No ticket exists with this number`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/tickets/:id/reply',
		alias: 'replyToTicket',
		description: `Adds a reply to a ticket&#x27;s linked conversation. Supports both contact and admin replies.

### Path Parameters

- &#x60;id&#x60; - The ticket number

### Contact Reply

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;type&#x60; | string | Yes | Must be &quot;contact&quot; |
| &#x60;contactId&#x60; | string | No* | Featurebase contact ID |
| &#x60;contactEmail&#x60; | string | No* | Contact email |
| &#x60;body&#x60; | string | Yes | Message content (HTML) |
| &#x60;messageType&#x60; | string | No | Always &quot;comment&quot; for contacts |
| &#x60;attachmentUrls&#x60; | string[] | No | Attachment URLs (max 10) |
| &#x60;skipNotifications&#x60; | boolean | No | Skip notifications (default false) |
| &#x60;createdAt&#x60; | string | No | ISO 8601 timestamp to backdate the reply |

*At least one of &#x60;contactId&#x60; or &#x60;contactEmail&#x60; is required.

### Admin Reply

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;type&#x60; | string | Yes | Must be &quot;admin&quot; |
| &#x60;adminId&#x60; | string | Yes | ID of the admin authoring the reply |
| &#x60;body&#x60; | string | Yes | Message content (HTML) |
| &#x60;messageType&#x60; | string | No | &quot;comment&quot; (default) or &quot;note&quot; for internal notes |
| &#x60;attachmentUrls&#x60; | string[] | No | Attachment URLs (max 10) |
| &#x60;skipNotifications&#x60; | boolean | No | Skip notifications (default false) |
| &#x60;createdAt&#x60; | string | No | ISO 8601 timestamp to backdate the reply |

### Response

Returns a reply confirmation object.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: replyToTicket_Body,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.number().int().gte(1),
			},
		],
		response: Ticket,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_request&#x60;: No linked conversation found or invalid reply parameters
- &#x60;missing_parameter&#x60;: contactId or contactEmail required for contact replies`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_request', 'missing_parameter']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: Ticket or contact not found`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/categories',
		alias: 'listTicketCategories',
		description: `Returns all ticket categories for the authenticated organization.

Ticket categories organize tickets into distinct containers. Each category can have different:
- Access controls (public, private, segment-restricted)
- Feature toggles (comments, posting enabled)
- Custom fields

Use the &#x60;supportBoard&#x60; and &#x60;supportBoardType&#x60; fields to identify ticket categories.

This endpoint returns all categories without pagination.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: z.array(Board),
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/categories/:id',
		alias: 'getTicketCategory',
		description: `Retrieves a single ticket category by its unique identifier.

Returns the full category object including access controls, feature toggles, and localization settings.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Board,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The category ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;board_not_found&#x60;: No ticket category exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('board_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/custom_fields',
		alias: 'listTicketCustomFields',
		description: `Returns all custom fields configured in your organization that can be used on tickets.

This endpoint returns all custom fields at once. No pagination is supported.

### Custom Field Object

Each custom field includes:
- &#x60;id&#x60; - Unique field identifier
- &#x60;label&#x60; - Field label displayed to users
- &#x60;type&#x60; - Field type (text, number, select, multi-select, checkbox, date, file)
- &#x60;required&#x60; - Whether the field is required
- &#x60;placeholder&#x60; - Placeholder text (for text/number fields)
- &#x60;public&#x60; - Whether the field value is publicly visible
- &#x60;internal&#x60; - Whether the field is for internal use only
- &#x60;options&#x60; - Array of options (for select/multi-select fields)
- &#x60;allowMultiple&#x60; - Whether multiple files can be uploaded (file fields only)`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: CustomFieldList,
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/custom_fields/:id',
		alias: 'getTicketCustomField',
		description: `Retrieves a single custom field by its unique identifier.

### Response

Returns a custom field object with:
- &#x60;id&#x60; - Unique field identifier
- &#x60;label&#x60; - Field label displayed to users
- &#x60;type&#x60; - Field type (text, number, select, multi-select, checkbox, date, file)
- &#x60;required&#x60; - Whether the field is required
- &#x60;placeholder&#x60; - Placeholder text (for text/number fields)
- &#x60;public&#x60; - Whether the field value is publicly visible
- &#x60;internal&#x60; - Whether the field is for internal use only
- &#x60;options&#x60; - Array of options (for select/multi-select fields)
- &#x60;allowMultiple&#x60; - Whether multiple files can be uploaded (file fields only)`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: CustomField,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The custom field ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;custom_field_not_found&#x60;: No custom field exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('custom_field_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/statuses',
		alias: 'listTicketStatuses',
		description: `Returns all ticket statuses for the authenticated organization.

Ticket statuses define workflow stages. Each status has:
- A display name and color
- A type indicating the workflow stage (reviewing, unstarted, active, completed, canceled)
- A flag indicating if it&#x27;s the default status for new tickets

This endpoint returns all statuses without pagination.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: z.array(PostStatus),
		errors: [
			{
				status: 400,
				description: `Bad Request - Validation error or invalid parameters`,
				schema: ValidationError,
			},
			{
				status: 404,
				description: `Not Found - Resource does not exist`,
				schema: NotFoundError,
			},
			{
				status: 500,
				description: `Internal Server Error`,
				schema: ServerError,
			},
		],
	},
	{
		method: 'get',
		path: '/v2/tickets/statuses/:id',
		alias: 'getTicketStatus',
		description: `Retrieves a single ticket status by its unique identifier.

Returns the status object including name, color, type, and default flag.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: PostStatus,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The status ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;resource_not_found&#x60;: No ticket status exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('resource_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/webhooks',
		alias: 'listWebhooks',
		description: `Returns a list of webhooks in your organization using cursor-based pagination.

### Query Parameters

- &#x60;limit&#x60; - Number of webhooks to return (1-100, default 10)
- &#x60;cursor&#x60; - Cursor from previous response for pagination
- &#x60;status&#x60; - Filter by status: &quot;active&quot;, &quot;paused&quot;, or &quot;suspended&quot;

### Response Format

Returns a list object with:
- &#x60;object&#x60; - Always &quot;list&quot;
- &#x60;data&#x60; - Array of webhook objects
- &#x60;nextCursor&#x60; - Cursor for the next page, or null if no more results

### Webhook Object

Each webhook includes:
- &#x60;id&#x60; - Unique webhook identifier
- &#x60;name&#x60; - Human-readable webhook name
- &#x60;url&#x60; - Webhook endpoint URL
- &#x60;topics&#x60; - Array of subscribed event topics
- &#x60;status&#x60; - Current status (&quot;active&quot;, &quot;paused&quot;, &quot;suspended&quot;)
- &#x60;health&#x60; - Health metrics (response times, error counts)
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;list&quot;,
  &quot;data&quot;: [
    {
      &quot;object&quot;: &quot;webhook&quot;,
      &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
      &quot;name&quot;: &quot;Production Webhook&quot;,
      &quot;url&quot;: &quot;https://example.com/webhooks&quot;,
      &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;],
      &quot;status&quot;: &quot;active&quot;,
      ...
    }
  ],
  &quot;nextCursor&quot;: &quot;eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'limit',
				type: 'Query',
				schema: z.number().int().gte(1).lte(100).optional().default(10),
			},
			{
				name: 'cursor',
				type: 'Query',
				schema: z.string().max(512).optional(),
			},
			{
				name: 'status',
				type: 'Query',
				schema: z.enum(['active', 'paused', 'suspended']).optional(),
			},
		],
		response: WebhookList,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_cursor&#x60;: The pagination cursor is malformed or expired`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_cursor'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/webhooks',
		alias: 'createWebhook',
		description: `Creates a new webhook to receive event notifications.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| &#x60;name&#x60; | string | Yes | Human-readable name (max 100 chars) |
| &#x60;url&#x60; | string | Yes | Webhook endpoint URL (must be HTTPS) |
| &#x60;description&#x60; | string | No | Optional description (max 500 chars) |
| &#x60;topics&#x60; | string[] | Yes | Event topics to subscribe to |
| &#x60;requestConfig&#x60; | object | No | Request configuration |
| &#x60;requestConfig.headers&#x60; | object | No | Custom headers to send (max 10) |

### Available Topics

- &#x60;post.created&#x60; - When a new feedback post is created
- &#x60;post.updated&#x60; - When a feedback post is updated
- &#x60;post.deleted&#x60; - When a feedback post is deleted
- &#x60;post.voted&#x60; - When a feedback post receives a vote
- &#x60;ticket.created&#x60; - When a new ticket is created
- &#x60;ticket.updated&#x60; - When a ticket is updated
- &#x60;ticket.deleted&#x60; - When a ticket is deleted
- &#x60;changelog.published&#x60; - When a changelog is published
- &#x60;comment.created&#x60; - When a comment is created
- &#x60;comment.updated&#x60; - When a comment is updated
- &#x60;comment.deleted&#x60; - When a comment is deleted

### Response

Returns the created webhook object including the signing secret.

### Example Request

&#x60;&#x60;&#x60;json
{
  &quot;name&quot;: &quot;Production Webhook&quot;,
  &quot;url&quot;: &quot;https://example.com/webhooks&quot;,
  &quot;description&quot;: &quot;Handles all production events&quot;,
  &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;, &quot;comment.created&quot;],
  &quot;requestConfig&quot;: {
    &quot;timeoutMs&quot;: 10000,
    &quot;headers&quot;: {
      &quot;X-Custom-Header&quot;: &quot;value&quot;
    }
  }
}
&#x60;&#x60;&#x60;

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;webhook&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;name&quot;: &quot;Production Webhook&quot;,
  &quot;url&quot;: &quot;https://example.com/webhooks&quot;,
  &quot;secret&quot;: &quot;whsec_abc123def456ghi789&quot;,
  &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;, &quot;comment.created&quot;],
  &quot;status&quot;: &quot;active&quot;,
  ...
}
&#x60;&#x60;&#x60;

### Limits

Each organization has a maximum number of webhooks (default: 10). Creating a webhook when the limit is reached will return a 400 error.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: CreateWebhookBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
		],
		response: Webhook,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_parameter&#x60;: Invalid request parameters
- &#x60;invalid_request&#x60;: Maximum number of webhooks reached for this organization`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.enum(['invalid_parameter', 'invalid_request']),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'get',
		path: '/v2/webhooks/:id',
		alias: 'getWebhookById',
		description: `Retrieves a single webhook by its unique identifier.

### Path Parameters

- &#x60;id&#x60; - The webhook ID (24-character ObjectId)

### Response Format

Returns a webhook object with:
- &#x60;object&#x60; - Always &quot;webhook&quot;
- &#x60;id&#x60; - Unique webhook identifier
- &#x60;name&#x60; - Human-readable webhook name
- &#x60;url&#x60; - Webhook endpoint URL
- &#x60;description&#x60; - Optional description
- &#x60;topics&#x60; - Array of subscribed event topics
- &#x60;status&#x60; - Current status (&quot;active&quot;, &quot;paused&quot;, &quot;suspended&quot;)
- &#x60;requestConfig&#x60; - Request configuration (timeout, headers)
- &#x60;lastStatus&#x60; - Last delivery attempt status
- &#x60;health&#x60; - Health metrics
- &#x60;createdAt&#x60; - Creation timestamp
- &#x60;updatedAt&#x60; - Last update timestamp

The response includes the webhook signing secret for payload verification.

### Example

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;webhook&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;name&quot;: &quot;Production Webhook&quot;,
  &quot;url&quot;: &quot;https://example.com/webhooks&quot;,
  &quot;description&quot;: &quot;Handles all production events&quot;,
  &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;],
  &quot;status&quot;: &quot;active&quot;,
  &quot;requestConfig&quot;: {
    &quot;timeoutMs&quot;: 5000,
    &quot;headers&quot;: {}
  },
  &quot;lastStatus&quot;: {
    &quot;code&quot;: 200,
    &quot;message&quot;: &quot;Success&quot;,
    &quot;timestamp&quot;: &quot;2025-01-15T10:30:00.000Z&quot;
  },
  &quot;health&quot;: {
    &quot;lastResponseTime&quot;: 150,
    &quot;avgResponseTime&quot;: 200,
    &quot;lastSuccessAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;,
    &quot;errorsSinceLastSuccess&quot;: 0,
    &quot;consecutiveFailures&quot;: 0
  },
  &quot;createdAt&quot;: &quot;2025-01-01T00:00:00.000Z&quot;,
  &quot;updatedAt&quot;: &quot;2025-01-15T10:30:00.000Z&quot;
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Webhook,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The webhook ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;webhook_not_found&#x60;: No webhook exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('webhook_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'patch',
		path: '/v2/webhooks/:id',
		alias: 'updateWebhook',
		description: `Updates a webhook&#x27;s properties. Supports partial updates - only provided fields will be updated.

### Path Parameters

- &#x60;id&#x60; - The webhook ID (24-character ObjectId)

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| &#x60;name&#x60; | string | Human-readable name (max 100 chars) |
| &#x60;url&#x60; | string | Webhook endpoint URL (must be HTTPS) |
| &#x60;description&#x60; | string/null | Description (null to clear) |
| &#x60;topics&#x60; | string[] | Event topics to subscribe to |
| &#x60;status&#x60; | string | &quot;active&quot; to reactivate, &quot;paused&quot; to pause delivery |
| &#x60;requestConfig&#x60; | object | Request configuration |
| &#x60;requestConfig.headers&#x60; | object | Custom headers to send (max 10) |

### Pausing and Reactivating Webhooks

You can pause a webhook to temporarily stop receiving events:

&#x60;&#x60;&#x60;json
{
  &quot;status&quot;: &quot;paused&quot;
}
&#x60;&#x60;&#x60;

Webhooks may also be automatically paused or suspended due to delivery failures. To reactivate:

&#x60;&#x60;&#x60;json
{
  &quot;status&quot;: &quot;active&quot;
}
&#x60;&#x60;&#x60;

Reactivating a webhook resets the health metrics and allows it to receive events again.

### Example: Update Topics

&#x60;&#x60;&#x60;json
{
  &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;, &quot;post.deleted&quot;]
}
&#x60;&#x60;&#x60;

### Example: Update Request Config

&#x60;&#x60;&#x60;json
{
  &quot;requestConfig&quot;: {
    &quot;headers&quot;: {
      &quot;X-Custom-Header&quot;: &quot;new-value&quot;
    }
  }
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'body',
				type: 'Body',
				schema: UpdateWebhookBody,
			},
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Webhook,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_parameter&#x60;: Invalid request parameters`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_parameter'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;webhook_not_found&#x60;: No webhook exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('webhook_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'delete',
		path: '/v2/webhooks/:id',
		alias: 'deleteWebhook',
		description: `Permanently deletes a webhook.

### Path Parameters

- &#x60;id&#x60; - The webhook ID (24-character ObjectId)

### Response

Returns a deletion confirmation object:

&#x60;&#x60;&#x60;json
{
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;object&quot;: &quot;webhook&quot;,
  &quot;deleted&quot;: true
}
&#x60;&#x60;&#x60;

### Caution

This operation is **irreversible**. The webhook and its configuration will be permanently deleted.
After deletion, no events will be sent to the webhook endpoint.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: DeletedWebhook,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The webhook ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;webhook_not_found&#x60;: No webhook exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('webhook_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
	{
		method: 'post',
		path: '/v2/webhooks/:id/secret',
		alias: 'refreshWebhookSecret',
		description: `Generates a new signing secret for a webhook. The previous secret is immediately invalidated.

### Path Parameters

- &#x60;id&#x60; - The webhook ID (24-character ObjectId)

### Response

Returns the updated webhook object, including the new signing secret.

### Important

After refreshing the secret, any integrations that verify webhook signatures using the old secret will stop working until they are updated with the new secret.

### Example Response

&#x60;&#x60;&#x60;json
{
  &quot;object&quot;: &quot;webhook&quot;,
  &quot;id&quot;: &quot;507f1f77bcf86cd799439011&quot;,
  &quot;name&quot;: &quot;Production Webhook&quot;,
  &quot;url&quot;: &quot;https://example.com/webhooks&quot;,
  &quot;secret&quot;: &quot;whsec_newSecret123abc456def&quot;,
  &quot;topics&quot;: [&quot;post.created&quot;, &quot;post.updated&quot;],
  &quot;status&quot;: &quot;active&quot;,
  ...
}
&#x60;&#x60;&#x60;

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.`,
		requestFormat: 'json',
		parameters: [
			{
				name: 'Featurebase-Version',
				type: 'Header',
				schema: z.string().optional(),
			},
			{
				name: 'id',
				type: 'Path',
				schema: z.string(),
			},
		],
		response: Webhook,
		errors: [
			{
				status: 400,
				description: `Bad Request

Possible error codes:
- &#x60;invalid_id&#x60;: The webhook ID format is invalid`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('invalid_id'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(400),
							})
							.passthrough(),
					})
					.passthrough(),
			},
			{
				status: 404,
				description: `Not Found

Possible error codes:
- &#x60;webhook_not_found&#x60;: No webhook exists with this ID`,
				schema: z
					.object({
						error: z
							.object({
								type: z.literal('invalid_request_error'),
								code: z.literal('webhook_not_found'),
								message: z.string(),
								param: z.string().optional(),
								status: z.literal(404),
							})
							.passthrough(),
					})
					.passthrough(),
			},
		],
	},
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
	return new Zodios(baseUrl, endpoints, options);
}
