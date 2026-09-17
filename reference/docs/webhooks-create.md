# Create a webhook

Creates a new webhook to receive event notifications.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Human-readable name (max 100 chars) |
| url | string | Yes | Webhook endpoint URL (must be HTTPS) |
| description | string | No | Optional description (max 500 chars) |
| topics | string[] | Yes | Event topics to subscribe to |
| requestConfig | object | No | Request configuration |
| requestConfig.headers | object | No | Custom headers to send (max 10) |

### Available Topics

- post.created - When a new feedback post is created
- post.updated - When a feedback post is updated
- post.deleted - When a feedback post is deleted
- post.voted - When a feedback post receives a vote
- ticket.created - When a new ticket is created
- ticket.updated - When a ticket is updated
- ticket.deleted - When a ticket is deleted
- changelog.published - When a changelog is published
- comment.created - When a comment is created
- comment.updated - When a comment is updated
- comment.deleted - When a comment is deleted

### Response

Returns the created webhook object including the signing secret.

### Example Request

json
{
  "name": "Production Webhook",
  "url": "https://example.com/webhooks",
  "description": "Handles all production events",
  "topics": ["post.created", "post.updated", "comment.created"],
  "requestConfig": {
    "timeoutMs": 10000,
    "headers": {
      "X-Custom-Header": "value"
    }
  }
}


### Example Response

json
{
  "object": "webhook",
  "id": "507f1f77bcf86cd799439011",
  "name": "Production Webhook",
  "url": "https://example.com/webhooks",
  "secret": "whsec_abc123def456ghi789",
  "topics": ["post.created", "post.updated", "comment.created"],
  "status": "active",
  ...
}


### Limits

Each organization has a maximum number of webhooks (default: 10). Creating a webhook when the limit is reached will return a 400 error.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

Endpoint: POST /v2/webhooks
Version: 2026-01-01.nova
Security: bearerAuth

## Header parameters:

  - `Featurebase-Version` (string)
    API version for this request. Defaults to your organization's configured API version if not specified.
    Example: "2026-01-01.nova"

## Request fields (application/json):

  - `name` (string, required)
    Human-readable name for the webhook
    Example: "Production Webhook"

  - `url` (string, required)
    Webhook endpoint URL (must be HTTPS)
    Example: "https://example.com/webhooks"

  - `description` (string)
    Optional description of the webhook purpose
    Example: "Handles all production events"

  - `topics` (array, required)
    Array of event topics to subscribe to
    Enum: "post.created", "post.updated", "post.deleted", "post.voted", "ticket.created", "ticket.updated", "ticket.deleted", "changelog.published", "comment.created", "comment.updated", "comment.deleted", "conversation.user.created", "conversation.user.replied", "conversation.admin.replied", "conversation.admin.closed", "conversation.handover_requested", "conversation.admin.assigned", "conversation.admin.noted", "conversation.admin.snoozed", "conversation.admin.unsnoozed", "conversation.admin.opened", "conversation.priority.updated", "conversation.deleted", "conversation.contact.attached", "conversation.contact.detached", "conversation.read", "conversation_part.redacted"

  - `requestConfig` (object)
    Request configuration for webhook delivery

  - `requestConfig.headers` (object)
    Custom headers to send with webhook requests (max 10)
    Example: {"X-Custom-Header":"value"}

## Response 201 fields (application/json):

  - `object` (string, required)
    Object type identifier
    Enum: "webhook"

  - `id` (string, required)
    Unique identifier
    Example: "507f1f77bcf86cd799439011"

  - `name` (string, required)
    Human-readable webhook name
    Example: "Production Webhook"

  - `url` (string, required)
    Webhook endpoint URL
    Example: "https://example.com/webhooks"

  - `secret` (string, required)
    Webhook signing secret for verifying payloads
    Example: "whsec_abc123def456ghi789"

  - `description` (string,null, required)
    Optional description of the webhook purpose
    Example: "Handles all production events"

  - `topics` (array, required)
    Array of event topics the webhook subscribes to
    Enum: "post.created", "post.updated", "post.deleted", "post.voted", "ticket.created", "ticket.updated", "ticket.deleted", "changelog.published", "comment.created", "comment.updated", "comment.deleted", "conversation.user.created", "conversation.user.replied", "conversation.admin.replied", "conversation.admin.closed", "conversation.handover_requested", "conversation.admin.assigned", "conversation.admin.noted", "conversation.admin.snoozed", "conversation.admin.unsnoozed", "conversation.admin.opened", "conversation.priority.updated", "conversation.deleted", "conversation.contact.attached", "conversation.contact.detached", "conversation.read", "conversation_part.redacted"

  - `status` (string, required)
    Current status of the webhook
    Enum: "active", "paused", "suspended"

  - `requestConfig` (object, required)

  - `requestConfig.timeoutMs` (integer, required)
    Request timeout in milliseconds (1000-30000)
    Example: 5000

  - `requestConfig.headers` (object)
    Custom headers to send with webhook requests
    Example: {"X-Custom-Header":"value"}

  - `lastStatus` (object,null, required)
    Last delivery attempt status

  - `lastStatus.code` (integer, required)
    HTTP status code from last delivery attempt
    Example: 200

  - `lastStatus.message` (string, required)
    Status message from last delivery attempt
    Example: "Success"

  - `lastStatus.timestamp` (string, required)
    ISO timestamp of last status update
    Example: "2025-01-15T10:30:00.000Z"

  - `health` (object, required)

  - `health.lastResponseTime` (number, required)
    Last response time in milliseconds
    Example: 150

  - `health.avgResponseTime` (number, required)
    Average response time in milliseconds
    Example: 200

  - `health.lastSuccessAt` (string,null, required)
    ISO timestamp of last successful delivery
    Example: "2025-01-15T10:30:00.000Z"

  - `health.errorsSinceLastSuccess` (integer, required)
    Number of errors since last successful delivery

  - `health.consecutiveFailures` (integer, required)
    Number of consecutive delivery failures

  - `version` (string, required)
    API version for webhook payloads
    Example: "1.0"

  - `createdAt` (string, required)
    ISO timestamp when the webhook was created
    Example: "2025-01-15T10:30:00.000Z"

  - `updatedAt` (string, required)
    ISO timestamp when the webhook was last updated
    Example: "2025-01-15T10:30:00.000Z"

## Response 400 fields (application/json):

  - `error` (object, required)

  - `error.type` (string, required)
    The type of error returned
    Enum: "invalid_request_error"

  - `error.code` (string, required)
    Machine-readable error code
    Enum: "invalid_parameter", "invalid_request"

  - `error.message` (string, required)
    Human-readable error message
    Example: "An error occurred"

  - `error.param` (string)
    The parameter that caused the error (if applicable)
    Example: "id"

  - `error.status` (number, required)
    HTTP status code
    Enum: 400


