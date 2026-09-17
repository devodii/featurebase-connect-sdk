# Posts

User-submitted feedback and feature requests. Posts belong to boards and can be upvoted, commented on, and tracked through statuses.

## List all posts

 - [GET /v2/posts](https://docs.featurebase.app/rest-api/posts/listposts.md): Returns all posts (feedback submissions) for the authenticated organization.

Posts are user-submitted feedback items. Each post belongs to a board and can have:
- Status (in progress, complete, etc.)
- Tags for categorization
- Upvotes from users
- Comments (if enabled)
- Custom field values

### Pagination

This endpoint uses cursor-based pagination:

- limit - Number of posts to return (1-100, default 10)
- cursor - Opaque cursor from a previous response's nextCursor field

Example: To paginate through results:
1. First request: GET /v2/posts?limit=10
2. If nextCursor is not null, use it for the next page
3. Next request: GET /v2/posts?limit=10&cursor={nextCursor}

### Response Format

Returns a list object with:
- object - Always "list"
- data - Array of post objects
- nextCursor - Cursor for the next page (null if no more results)

### Filtering

Filter posts using query parameters:
- boardId - Filter by board (category) ID
- statusId - Filter by status ID
- tags - Filter by tag names (can be comma-separated or repeated)
- q - Search query for title/content
- inReview - Include posts pending moderation

### Sorting

Use sortBy to sort results:
- createdAt - Sort by creation date (default)
- upvotes - Sort by vote count
- trending - Sort by trending score
- recent - Sort by most recently updated

## Create a new post

 - [POST /v2/posts](https://docs.featurebase.app/rest-api/posts/createpost.md): Creates a new post (feedback submission) in the specified board.

### Required Fields

- title - Post title (minimum 2 characters)
- boardId - Board ID to create the post in

### Optional Fields

- content - Post content in HTML format
- tags - Array of tag names to attach
- statusId - Status ID to set (defaults to board's default status)
- commentsEnabled - Whether comments are allowed (default: true)
- inReview - Whether post is pending moderation (default: false)
- customFields - Custom field values as key-value pairs
- eta - Estimated completion date (Unix timestamp or ISO date)
- assigneeId - Admin ID to assign this post to
- visibility - Post-level visibility restriction: 'public' (no additional restrictions), 'authorOnly' (only author and admins), or 'companyOnly' (only users in author's company). Note: even 'public' posts are still subject to board-level and organization-level access controls.

### Author Attribution

For posts created on behalf of users, use the author object:
- id - Featurebase user ID
- userId - External SSO user ID
- email - User's email address
- name - Display name
- profilePicture - Profile picture URL

Resolution priority: id > userId > email > authenticated user

### Backdating (Imports)

- createdAt - Override creation date for importing historical data

### Response

Returns the created post object with all fields populated.

## Get a post by ID

 - [GET /v2/posts/{id}](https://docs.featurebase.app/rest-api/posts/getpost.md): Retrieves a single post by its unique identifier.

Returns the full post object including:
- Author information
- Current status
- Tags
- Voting stats
- Engagement metrics
- Custom field values

## Update a post

 - [PATCH /v2/posts/{id}](https://docs.featurebase.app/rest-api/posts/updatepost.md): Updates an existing post. Only provided fields will be modified.

### Updatable Fields

- title - Post title (minimum 2 characters)
- content - Post content in HTML format
- boardId - Move post to a different board
- statusId - Update post status
- tags - Replace existing tags with new set
- commentsEnabled - Enable/disable comments
- inReview - Put post in/out of moderation queue
- customFields - Update custom field values
- eta - Set estimated completion date (null to clear)
- createdAt - Update creation date (for backdating)
- assigneeId - Admin ID to assign this post to (null to unassign)
- visibility - Post-level visibility restriction: 'public' (no additional restrictions), 'authorOnly' (only author and admins), or 'companyOnly' (only users in author's company). Note: even 'public' posts are still subject to board-level and organization-level access controls.
- author - Change post attribution (id, userId, email, name, profilePicture)

### Status Update Notifications

- sendStatusUpdateEmail - When changing status, optionally send email notification to voters (default: false)

### Response

Returns the updated post object with all fields populated.

## Delete a post

 - [DELETE /v2/posts/{id}](https://docs.featurebase.app/rest-api/posts/deletepost.md): Permanently deletes a post. This action cannot be undone.

### What Gets Deleted

When you delete a post:
- The post itself is permanently removed
- All comments on the post are deleted
- Vote records are removed
- Any associated notifications are cleared

### Response

Returns a deletion confirmation object with:
- id - The ID of the deleted post
- object - Always "post"
- deleted - Always true

### Permissions

Requires member-level access or higher to delete posts.

## List voters on a post

 - [GET /v2/posts/{id}/voters](https://docs.featurebase.app/rest-api/posts/listvoters.md): Returns all voters (upvoters) for a specific post.

Voters are users who have upvoted the post. Each voter is returned in the standard user format with:
- Basic info: id, name, email, profilePicture
- User type (admin, customer, guest, etc.)
- Companies the user belongs to
- Activity stats: commentsCreated, postsCreated, lastActivity
- Preferences: subscribedToChangelog, locale, verified

### Pagination

This endpoint uses cursor-based pagination:

- limit - Number of voters to return (1-100, default 10)
- cursor - Opaque cursor from a previous response's nextCursor field

Example: To paginate through results:
1. First request: GET /v2/posts/{id}/voters?limit=10
2. If nextCursor is not null, use it for the next page
3. Next request: GET /v2/posts/{id}/voters?limit=10&cursor={nextCursor}

### Response Format

Returns a list object with:
- object - Always "list"
- data - Array of user objects
- nextCursor - Cursor for the next page (null if no more results)

### Permissions

Requires member-level access or higher.

## Add a voter to a post

 - [POST /v2/posts/{id}/voters](https://docs.featurebase.app/rest-api/posts/addvoter.md): Adds a voter (upvote) to a post.

### Voter Identification

To add a vote on behalf of a user, provide one or more identification fields:
- id - Featurebase user ID
- userId - External SSO user ID from your system
- email - User's email address
- name - Display name (used when creating a new user)
- profilePicture - Profile picture URL (used when creating a new user)

Resolution priority: id > userId > email > authenticated user

If no fields are provided, the authenticated user's vote is added.

If the user doesn't exist, a new customer will be created with the provided information.

### Idempotency

If the user has already voted on this post, the request succeeds but no duplicate vote is added.

### Response

Returns a confirmation object with:
- object - Always "voter"
- added - Always true
- id - The voter's user ID
- postId - The post ID the vote was added to

### Permissions

Requires member-level access or higher.

## Remove a voter from a post

 - [DELETE /v2/posts/{id}/voters](https://docs.featurebase.app/rest-api/posts/removevoter.md): Removes a voter (upvote) from a post.

### Voter Identification

To remove a vote on behalf of a user, provide one or more identification fields:
- id - Featurebase user ID
- userId - External SSO user ID from your system
- email - User's email address

Resolution priority: id > userId > email > authenticated user

If no fields are provided, the authenticated user's vote will be removed.

### Response

Returns a confirmation object with:
- object - Always "voter"
- removed - Always true
- id - The voter's user ID
- postId - The post ID the vote was removed from

### Permissions

Requires member-level access or higher.

