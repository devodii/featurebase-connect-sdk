# Webhooks

Webhooks allow you to receive real-time HTTP callbacks when events occur in your Featurebase organization. Configure webhook endpoints to subscribe to specific event types.

## List webhooks

 - [GET /v2/webhooks](https://docs.featurebase.app/rest-api/webhooks/listwebhooks.md): Returns a list of webhooks in your organization using cursor-based pagination.

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

## Create a webhook

 - [POST /v2/webhooks](https://docs.featurebase.app/rest-api/webhooks/createwebhook.md): Creates a new webhook to receive event notifications.

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

## Get webhook by ID

 - [GET /v2/webhooks/{id}](https://docs.featurebase.app/rest-api/webhooks/getwebhookbyid.md): Retrieves a single webhook by its unique identifier.

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

## Update a webhook

 - [PATCH /v2/webhooks/{id}](https://docs.featurebase.app/rest-api/webhooks/updatewebhook.md): Updates a webhook's properties. Supports partial updates - only provided fields will be updated.

### Path Parameters

- id - The webhook ID (24-character ObjectId)

### Request Body

All fields are optional. Only provided fields will be updated.

| Field | Type | Description |
|-------|------|-------------|
| name | string | Human-readable name (max 100 chars) |
| url | string | Webhook endpoint URL (must be HTTPS) |
| description | string/null | Description (null to clear) |
| topics | string[] | Event topics to subscribe to |
| status | string | "active" to reactivate, "paused" to pause delivery |
| requestConfig | object | Request configuration |
| requestConfig.headers | object | Custom headers to send (max 10) |

### Pausing and Reactivating Webhooks

You can pause a webhook to temporarily stop receiving events:

json
{
  "status": "paused"
}


Webhooks may also be automatically paused or suspended due to delivery failures. To reactivate:

json
{
  "status": "active"
}


Reactivating a webhook resets the health metrics and allows it to receive events again.

### Example: Update Topics

json
{
  "topics": ["post.created", "post.updated", "post.deleted"]
}


### Example: Update Request Config

json
{
  "requestConfig": {
    "headers": {
      "X-Custom-Header": "new-value"
    }
  }
}


### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

## Delete a webhook

 - [DELETE /v2/webhooks/{id}](https://docs.featurebase.app/rest-api/webhooks/deletewebhook.md): Permanently deletes a webhook.

### Path Parameters

- id - The webhook ID (24-character ObjectId)

### Response

Returns a deletion confirmation object:

json
{
  "id": "507f1f77bcf86cd799439011",
  "object": "webhook",
  "deleted": true
}


### Caution

This operation is irreversible. The webhook and its configuration will be permanently deleted.
After deletion, no events will be sent to the webhook endpoint.

### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

## Refresh webhook signing secret

 - [POST /v2/webhooks/{id}/secret](https://docs.featurebase.app/rest-api/webhooks/refreshwebhooksecret.md): Generates a new signing secret for a webhook. The previous secret is immediately invalidated.

### Path Parameters

- id - The webhook ID (24-character ObjectId)

### Response

Returns the updated webhook object, including the new signing secret.

### Important

After refreshing the secret, any integrations that verify webhook signatures using the old secret will stop working until they are updated with the new secret.

### Example Response

json
{
  "object": "webhook",
  "id": "507f1f77bcf86cd799439011",
  "name": "Production Webhook",
  "url": "https://example.com/webhooks",
  "secret": "whsec_newSecret123abc456def",
  "topics": ["post.created", "post.updated"],
  "status": "active",
  ...
}


### Version Availability

This endpoint is only available in API version 2026-01-01.nova and newer.

