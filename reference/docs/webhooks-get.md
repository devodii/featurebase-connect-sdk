# Get webhook by ID

Retrieves a single webhook by its unique identifier.

### Path Parameters

- id - The webhook ID (24-character ObjectId)

### Response Format

Returns a webhook object with:
- object - Always "webhook"
- id - Unique webhook identifier
- name - Human-readable webhook name
- url - Webhook endpoint URL
- description - Optional description
- topics - Array of subscribed event topics
- status - Current status ("active", "paused", "suspended")
- requestConfig - Request configuration (timeout, headers)
- lastStatus - Last delivery attempt status
- health - Health metrics
- createdAt - Creation timestamp
- updatedAt - Last update timestamp

The response includes the webhook signing secret for payload verification.

### Example

json
{
  "object": "webhook",
  "id": "507f1f77bcf86cd799439011",
  "name": "Production Webhook",
  "url": "https://example.com/webhooks",
  "description": "Handles all production events",
  "topics": ["post.created", "post.updated"],
  "status": "active",
  "requestConfig": {
    "timeoutMs": 5000,
    "headers": {}
  },
  "lastStatus": {
    "code": 200,
    "message": "Success",
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "health": {
    "lastResponseTime": 150,
    "avgResponseTime": 200,
    "lastSuccessAt": "2025-01-15T10:30:00.000Z",
    "errorsSinceLastSuccess": 0,
    "consecutiveFailures": 0
  },
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T10:30:00.000Z"
}


### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

Endpoint: GET /v2/webhooks/{id}
Version: 2026-01-01.nova
Security: bearerAuth

## Header parameters:

  - `Featurebase-Version` (string)
    API version for this request. Defaults to your organization's configured API version if not specified.
    Example: "2026-01-01.nova"

## Path parameters:

  - `id` (string, required)
    Webhook unique identifier
    Example: "507f1f77bcf86cd799439011"

## Response 200 fields (application/json):

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
    Enum: "invalid_id"

  - `error.message` (string, required)
    Human-readable error message
    Example: "An error occurred"

  - `error.param` (string)
    The parameter that caused the error (if applicable)
    Example: "id"

  - `error.status` (number, required)
    HTTP status code
    Enum: 400

## Response 404 fields (application/json):

  - `error` (object, required)

  - `error.type` (string, required)
    The type of error returned
    Enum: "invalid_request_error"

  - `error.code` (string, required)
    Machine-readable error code
    Enum: "webhook_not_found"

  - `error.message` (string, required)
    Human-readable error message
    Example: "An error occurred"

  - `error.param` (string)
    The parameter that caused the error (if applicable)
    Example: "id"

  - `error.status` (number, required)
    HTTP status code
    Enum: 404


