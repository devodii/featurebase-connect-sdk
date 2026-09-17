# List webhooks

Returns a list of webhooks in your organization using cursor-based pagination.

### Query Parameters

- limit - Number of webhooks to return (1-100, default 10)
- cursor - Cursor from previous response for pagination
- status - Filter by status: "active", "paused", or "suspended"

### Response Format

Returns a list object with:
- object - Always "list"
- data - Array of webhook objects
- nextCursor - Cursor for the next page, or null if no more results

### Webhook Object

Each webhook includes:
- id - Unique webhook identifier
- name - Human-readable webhook name
- url - Webhook endpoint URL
- topics - Array of subscribed event topics
- status - Current status ("active", "paused", "suspended")
- health - Health metrics (response times, error counts)
- createdAt - Creation timestamp
- updatedAt - Last update timestamp

### Example

json
{
  "object": "list",
  "data": [
    {
      "object": "webhook",
      "id": "507f1f77bcf86cd799439011",
      "name": "Production Webhook",
      "url": "https://example.com/webhooks",
      "topics": ["post.created", "post.updated"],
      "status": "active",
      ...
    }
  ],
  "nextCursor": "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9"
}


### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

Endpoint: GET /v2/webhooks
Version: 2026-01-01.nova
Security: bearerAuth

## Header parameters:

  - `Featurebase-Version` (string)
    API version for this request. Defaults to your organization's configured API version if not specified.
    Example: "2026-01-01.nova"

## Query parameters:

  - `limit` (integer)
    A limit on the number of objects to be returned, between 1 and 100.
    Example: 10

  - `cursor` (string)
    An opaque cursor for pagination. Use the nextCursor value from a previous response to fetch the next page of results.
    Example: "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9"

  - `status` (string)
    Filter webhooks by status
    Enum: "active", "paused", "suspended"

## Response 200 fields (application/json):

  - `object` (string, required)
    Object type identifier
    Enum: "list"

  - `data` (array, required)
    Array of webhooks
    Example: []

  - `data.id` (string, required)
    Unique identifier
    Example: "507f1f77bcf86cd799439011"

  - `data.name` (string, required)
    Human-readable webhook name
    Example: "Production Webhook"

  - `data.url` (string, required)
    Webhook endpoint URL
    Example: "https://example.com/webhooks"

  - `data.secret` (string, required)
    Webhook signing secret for verifying payloads
    Example: "whsec_abc123def456ghi789"

  - `data.description` (string,null, required)
    Optional description of the webhook purpose
    Example: "Handles all production events"

  - `data.topics` (array, required)
    Array of event topics the webhook subscribes to
    Enum: "post.created", "post.updated", "post.deleted", "post.voted", "ticket.created", "ticket.updated", "ticket.deleted", "changelog.published", "comment.created", "comment.updated", "comment.deleted", "conversation.user.created", "conversation.user.replied", "conversation.admin.replied", "conversation.admin.closed", "conversation.handover_requested", "conversation.admin.assigned", "conversation.admin.noted", "conversation.admin.snoozed", "conversation.admin.unsnoozed", "conversation.admin.opened", "conversation.priority.updated", "conversation.deleted", "conversation.contact.attached", "conversation.contact.detached", "conversation.read", "conversation_part.redacted"

  - `data.status` (string, required)
    Current status of the webhook
    Enum: "active", "paused", "suspended"

  - `data.requestConfig` (object, required)

  - `data.requestConfig.timeoutMs` (integer, required)
    Request timeout in milliseconds (1000-30000)
    Example: 5000

  - `data.requestConfig.headers` (object)
    Custom headers to send with webhook requests
    Example: {"X-Custom-Header":"value"}

  - `data.lastStatus` (object,null, required)
    Last delivery attempt status

  - `data.lastStatus.code` (integer, required)
    HTTP status code from last delivery attempt
    Example: 200

  - `data.lastStatus.message` (string, required)
    Status message from last delivery attempt
    Example: "Success"

  - `data.lastStatus.timestamp` (string, required)
    ISO timestamp of last status update
    Example: "2025-01-15T10:30:00.000Z"

  - `data.health` (object, required)

  - `data.health.lastResponseTime` (number, required)
    Last response time in milliseconds
    Example: 150

  - `data.health.avgResponseTime` (number, required)
    Average response time in milliseconds
    Example: 200

  - `data.health.lastSuccessAt` (string,null, required)
    ISO timestamp of last successful delivery
    Example: "2025-01-15T10:30:00.000Z"

  - `data.health.errorsSinceLastSuccess` (integer, required)
    Number of errors since last successful delivery

  - `data.health.consecutiveFailures` (integer, required)
    Number of consecutive delivery failures

  - `data.version` (string, required)
    API version for webhook payloads
    Example: "1.0"

  - `data.createdAt` (string, required)
    ISO timestamp when the webhook was created
    Example: "2025-01-15T10:30:00.000Z"

  - `data.updatedAt` (string, required)
    ISO timestamp when the webhook was last updated
    Example: "2025-01-15T10:30:00.000Z"

  - `nextCursor` (string,null, required)
    Cursor for fetching the next page (cursor-based pagination)
    Example: "eyJpZCI6IjUwN2YxZjc3YmNmODZjZDc5OTQzOTAxMSJ9"

## Response 400 fields (application/json):

  - `error` (object, required)

  - `error.type` (string, required)
    The type of error returned
    Enum: "invalid_request_error"

  - `error.code` (string, required)
    Machine-readable error code
    Enum: "invalid_cursor"

  - `error.message` (string, required)
    Human-readable error message
    Example: "An error occurred"

  - `error.param` (string)
    The parameter that caused the error (if applicable)
    Example: "id"

  - `error.status` (number, required)
    HTTP status code
    Enum: 400


