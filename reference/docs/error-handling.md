# Error Handling

The API uses conventional HTTP response codes to indicate success or failure:

- `2xx` - Success
- `4xx` - Client errors (bad request, unauthorized, not found, etc.)
- `5xx` - Server errors (internal error)

**Error Response Format**

All errors follow a consistent format:

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "resource_not_found",
    "message": "Post not found",
    "param": "id",
    "status": 404
  }
}
```

**Error Types**

| Type | Description |
|------|-------------|
| `authentication_error` | Authentication failed (401) |
| `authorization_error` | Permission denied (403) |
| `invalid_request_error` | Invalid request parameters or resource not found (400, 404, 410) |
| `api_error` | Server-side error (500) |
| `rate_limit_error` | Too many requests (429) |

