/**
 * Derived from the `topics` enum on CreateWebhookBody/UpdateWebhookBody in
 * openapi.json. Ticket topics (ticket.created/updated/deleted) exist in that
 * enum too, but tickets are a separate resource this package doesn't cover.
 */
export const WEBHOOK_TOPICS: Array<{ name: string; value: string; group: string }> = [
	{ name: 'Post Created', value: 'post.created', group: 'Feedback' },
	{ name: 'Post Updated', value: 'post.updated', group: 'Feedback' },
	{ name: 'Post Deleted', value: 'post.deleted', group: 'Feedback' },
	{ name: 'Post Voted', value: 'post.voted', group: 'Feedback' },
	{ name: 'Changelog Published', value: 'changelog.published', group: 'Changelog' },
	{ name: 'Comment Created', value: 'comment.created', group: 'Comments' },
	{ name: 'Comment Updated', value: 'comment.updated', group: 'Comments' },
	{ name: 'Comment Deleted', value: 'comment.deleted', group: 'Comments' },
	{ name: 'Conversation: User Created', value: 'conversation.user.created', group: 'Conversations' },
	{ name: 'Conversation: User Replied', value: 'conversation.user.replied', group: 'Conversations' },
	{ name: 'Conversation: Admin Replied', value: 'conversation.admin.replied', group: 'Conversations' },
	{ name: 'Conversation: Admin Closed', value: 'conversation.admin.closed', group: 'Conversations' },
	{ name: 'Conversation: Handover Requested', value: 'conversation.handover_requested', group: 'Conversations' },
	{ name: 'Conversation: Admin Assigned', value: 'conversation.admin.assigned', group: 'Conversations' },
	{ name: 'Conversation: Admin Noted', value: 'conversation.admin.noted', group: 'Conversations' },
	{ name: 'Conversation: Admin Snoozed', value: 'conversation.admin.snoozed', group: 'Conversations' },
	{ name: 'Conversation: Admin Unsnoozed', value: 'conversation.admin.unsnoozed', group: 'Conversations' },
	{ name: 'Conversation: Admin Opened', value: 'conversation.admin.opened', group: 'Conversations' },
	{ name: 'Conversation: Priority Updated', value: 'conversation.priority.updated', group: 'Conversations' },
	{ name: 'Conversation: Deleted', value: 'conversation.deleted', group: 'Conversations' },
	{ name: 'Conversation: Contact Attached', value: 'conversation.contact.attached', group: 'Conversations' },
	{ name: 'Conversation: Contact Detached', value: 'conversation.contact.detached', group: 'Conversations' },
	{ name: 'Conversation: Read', value: 'conversation.read', group: 'Conversations' },
	{ name: 'Conversation Part: Redacted', value: 'conversation_part.redacted', group: 'Conversations' },
];
