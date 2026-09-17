# Featurebase API findings

Source of truth: `reference/openapi.json` (OpenAPI 3.1, title "Featurebase API", version `2026-01-01.nova`), fetched via the Wayback Machine after `docs.featurebase.app` returned a live HTTP 402 "Documentation unavailable" on every path (confirmed independently with `curl` and an isolated fetch tool — this is the doc host itself being down, not a user-agent block). Supplementary markdown pages are under `reference/docs/`, also recovered via Wayback where the live site failed. Where spec and docs disagreed, the spec won; disagreements are called out below.

## 1. Resources and operations (69 paths, 20 tags)

Grouped exactly as `x-tagGroups` in the spec:

**Getting Started** — API Versioning, Authentication, Error Handling (no operations, guide pages only)

**Feedback**
- Boards: `GET /v2/boards` (listBoards), `GET /v2/boards/{id}` (getBoard)
- Posts: `GET /v2/posts` (listPosts), `POST /v2/posts` (createPost), `GET /v2/posts/{id}` (getPost), `PATCH /v2/posts/{id}` (updatePost), `DELETE /v2/posts/{id}` (deletePost), `GET /v2/posts/{id}/voters` (listVoters), `POST /v2/posts/{id}/voters` (addVoter), `DELETE /v2/posts/{id}/voters` (removeVoter)
- Post Statuses: `GET /v2/post_statuses` (listPostStatuses), `GET /v2/post_statuses/{id}` (getPostStatus)
- Comments: `GET /v2/comments` (listComments), `POST /v2/comments` (createComment), `GET /v2/comments/{id}` (getComment), `PATCH /v2/comments/{id}` (updateComment), `DELETE /v2/comments/{id}` (deleteComment) — plus a legacy `DELETE /v2/comment` (deleteCommentClover, not used by this package)
- Custom Fields: `GET /v2/custom_fields` (listCustomFields), `GET /v2/custom_fields/{id}` (getCustomField)

**Changelog**
- `GET /v2/changelogs` (listChangelogs), `POST /v2/changelogs` (createChangelog), `GET /v2/changelogs/{id}` (getChangelog), `PATCH /v2/changelogs/{id}` (updateChangelog), `DELETE /v2/changelogs/{id}` (deleteChangelog), `POST /v2/changelogs/{id}/publish` (publishChangelog), `POST /v2/changelogs/{id}/unpublish` (unpublishChangelog), `POST /v2/changelogs/subscribers` (addChangelogSubscribers), `DELETE /v2/changelogs/subscribers` (removeChangelogSubscribers)

**Organization**
- Admins: `GET /v2/admins` (listAdmins), `GET /v2/admins/{id}` (getAdmin), `GET /v2/admins/roles` (listAdminRoles)
- Teams: `GET /v2/teams` (listTeams), `GET /v2/teams/{id}` (getTeamById)
- Brands: `GET /v2/brands` (listBrands), `GET /v2/brands/{id}` (getBrandById)

**Users**
- Contacts: `GET /v2/contacts` (listContacts), `POST /v2/contacts` (upsertContact), `GET /v2/contacts/{id}` (getContactById), `DELETE /v2/contacts/{id}` (deleteContactById), `GET|DELETE /v2/contacts/by-user-id/{userId}`, `GET|PATCH .../email-preferences`, `POST /v2/contacts/{id}/block`, `POST /v2/contacts/{id}/unblock`
- Companies: `GET /v2/companies` (listCompanies), `POST /v2/companies` (upsertCompany), `GET /v2/companies/{id}` (getCompanyById), `DELETE /v2/companies/{id}`, `DELETE /v2/companies/by-company-id/{companyId}`, `GET|POST /v2/companies/{id}/contacts`, `DELETE /v2/companies/{id}/contacts/{contactId}`

**Products**
- Surveys: `GET /v2/surveys` (listSurveys), `GET /v2/surveys/{id}` (getSurvey), `GET /v2/surveys/{id}/responses` (getSurveyResponses)
- Help Centers: `GET /v2/help_center/help_centers`, `GET /v2/help_center/help_centers/{id}`, `GET|POST /v2/help_center/collections`, `GET|PATCH|DELETE /v2/help_center/collections/{id}`, `GET|POST /v2/help_center/articles`, `GET|PATCH|DELETE /v2/help_center/articles/{id}`, `GET|POST /v2/help_center/redirect_rules`, `GET /v2/help_center/redirect_rules/by-url`, `GET|PATCH|DELETE /v2/help_center/redirect_rules/{id}`
- Conversations: `GET /v2/conversations` (listConversations), `POST /v2/conversations` (createConversation), `GET /v2/conversations/{id}`, `PATCH /v2/conversations/{id}` (updateConversation — state/assignee/team/title/customAttributes/markAsRead), `DELETE /v2/conversations/{id}`, `POST /v2/conversations/{id}/tags`, `DELETE /v2/conversations/{id}/tags/{tagId}`, `POST /v2/conversations/{id}/reply` (replyToConversation — admin reply **or** note via `messageType: reply|note`), `POST/DELETE /v2/conversations/{id}/participants`, `POST /v2/conversations/redact`
- Conversation Tags: `GET|POST /v2/tags`, `GET|DELETE /v2/tags/{id}` — this is a **conversation-tag** registry, separate from post tags (see §9)
- Tickets: full CRUD + reply + categories/statuses/custom fields under `/v2/tickets*` — not in the original task scope; **out of scope for this package** (support-inbox "Conversations" already covers the requested surface; Tickets is a separate help-desk object type Featurebase added after the task was scoped). Logged here for completeness, not implemented.

**Integrations**
- Webhooks: `GET /v2/webhooks` (listWebhooks), `POST /v2/webhooks` (createWebhook), `GET /v2/webhooks/{id}` (getWebhookById), `PATCH /v2/webhooks/{id}` (updateWebhook), `DELETE /v2/webhooks/{id}` (deleteWebhook), `POST /v2/webhooks/{id}/secret` (refreshWebhookSecret)

## 2. Auth scheme

Confirmed from `components.securitySchemes.bearerAuth` and `reference/docs/authentication.md`:
- `Authorization: Bearer <api-key>` (spec example key prefix: `sk_...`)
- `Featurebase-Version: 2026-01-01.nova` header, date-based versioning (`reference/docs/api-versioning.md`). Omitting it falls back to the org's configured default version — this package always sends it explicitly, pinned to the credential's `apiVersion` field.
- Base URL: `https://do.featurebase.app` (the archived spec's `servers[0].url` was rewritten by the Wayback proxy to `https://web.archive.org/web/.../https://do.featurebase.app`; this was stripped back out of `reference/openapi.json` before committing).

## 3. Pagination

Cursor-based, confirmed on `PostList`/`CommentList`/`ConversationList`/`TicketList`/etc:
- Request: `limit` (integer, 1-100, default 10), `cursor` (opaque string, from a previous response's `nextCursor`)
- Response: `{ object: "list", data: [...], nextCursor: string | null }`
- `PostList` additionally carries an optional `pagination` object (`page`, `limit`, `total`, `totalPages` — the `PaginationMetadata` schema) alongside `nextCursor`. This package uses `nextCursor` exclusively for `returnAll`/`Get Many`, since it's the field every list endpoint guarantees.

## 4. Error envelope

Confirmed shape (`ValidationError`/`NotFoundError`/`ServerError` schemas plus `reference/docs/error-handling.md`):
```json
{ "error": { "type": "invalid_request_error", "code": "resource_not_found", "message": "Post not found", "param": "id", "status": 404 } }
```
- `type` values documented: `authentication_error` (401), `authorization_error` (403), `invalid_request_error` (400/404/410), `api_error` (500), `rate_limit_error` (429).
- **Gap**: only `ValidationError`, `NotFoundError`, `ServerError` are modeled as named schemas in `components.schemas`; there is no schema for the 401/403/429 cases, so their exact `code` enums are not confirmed. `error-handling.md` confirms the `type` values above but not per-code detail for auth/rate-limit errors. `GenericFunctions.ts` normalises on `error.type === 'rate_limit_error'` for retry, per the docs, and falls back to `error.message`/`error.code` for everything else.
- `code` enums that **are** confirmed (from `ValidationError`/`NotFoundError`/`ServerError`): `invalid_id`, `invalid_parameter`, `missing_parameter`, `invalid_cursor`, `invalid_content`, `invalid_request`, `contact_not_customer`, `contact_not_attached`, `parameter_not_supported`, `business_validation_error`, `resource_not_found`, `post_not_found`, `comment_not_found`, `changelog_not_found`, `admin_not_found`, `contact_not_found`, `conversation_not_found`, `conversation_part_not_found`, `team_not_found`, `survey_not_found`, `company_not_found`, `help_center_not_found`, `collection_not_found`, `article_not_found`, `custom_field_not_found`, `board_not_found`, `voter_not_found`, `participant_not_found`, `webhook_not_found`, `redirect_rule_not_found`, `brand_not_found`, `version_not_supported`, `database_error`, `internal_error`, `fetch_error`, `create_error`, `update_error`, `delete_error`.

## 5. Webhook topics (26 total, confirmed via the `topics` enum shared by `CreateWebhookBody` and `UpdateWebhookBody`)

**Feedback**: `post.created`, `post.updated`, `post.deleted`, `post.voted`

**Tickets** (not implemented, see §1): `ticket.created`, `ticket.updated`, `ticket.deleted`

**Changelog**: `changelog.published`

**Comments**: `comment.created`, `comment.updated`, `comment.deleted`

**Conversations**: `conversation.user.created`, `conversation.user.replied`, `conversation.admin.replied`, `conversation.admin.closed`, `conversation.handover_requested`, `conversation.admin.assigned`, `conversation.admin.noted`, `conversation.admin.snoozed`, `conversation.admin.unsnoozed`, `conversation.admin.opened`, `conversation.priority.updated`, `conversation.deleted`, `conversation.contact.attached`, `conversation.contact.detached`, `conversation.read`

**Conversation parts**: `conversation_part.redacted`

**Task file divergence**: the task's grouping said "Comments (comment.created/updated/deleted)" and "Conversations (all conversation.* and conversation_part.* topics present in docs)" — matches exactly. Ticket topics exist in the spec but tickets are out of scope (§1), so the trigger node does not expose them.

## 6. Webhook create/list/delete + exact create body

- `POST /v2/webhooks` (`CreateWebhookBody`): `name` (string, required), `url` (string, required, must be HTTPS), `description` (string, optional), `topics` (string[], required, ≥1 item, from the enum above), `requestConfig.headers` (object, ≤10 custom headers, optional). **There is no client-supplied `secret` field** — the server always generates one.
- Response (`Webhook` schema) includes `secret` (format `whsec_...`) **only in the create/refresh responses**; `GET`/`list` do not return it back (standard show-once pattern).
- `GET /v2/webhooks` (listWebhooks, cursor-paginated), `GET /v2/webhooks/{id}`, `PATCH /v2/webhooks/{id}` (updateWebhook — name/url/description/topics/status/requestConfig), `DELETE /v2/webhooks/{id}`, `POST /v2/webhooks/{id}/secret` (refreshWebhookSecret — invalidates the old secret immediately).
- Limit: **10 webhooks per organization** (from `reference/docs/webhooks-rest.md`); exceeding it returns a 400. No documented specific error `code` for this case in the schemas — the trigger node surfaces the raw message and tells the user to delete an old endpoint.
- `status` field: `active` | `paused` | `suspended`. Featurebase can auto-pause/suspend a webhook after repeated delivery failures; reactivating via `PATCH { status: "active" }` resets health metrics.

## 7. Outbound signature

**Confirmed**: the webhook secret is prefixed `whsec_...` and docs state it is used "for payload verification" (`reference/docs/webhooks-rest.md`).

**Not confirmed — genuine gap.** The guide site's own IA (recovered from an archived render of `/guides/webhooks`) lists five sub-pages: Overview, **Consuming webhooks**, **Topic types**, **Handler examples**, **Security**, **Delivery behaviors**. Only "Overview" (registering webhooks, the 10-endpoint cap, HTTPS requirement) was recoverable from the Wayback Machine — the other four were never crawled/archived and the live site 402s. This means:
- The exact signature header name (e.g. `Featurebase-Signature`) and algorithm/encoding (e.g. HMAC-SHA256 over `id.timestamp.payload`, hex vs base64) are **not confirmed by any source in this repo**.
- The exact retry/backoff schedule for outbound deliveries is **not confirmed**.
- The `changes` array shape on `*.updated` payloads (`field`/`oldValue`/`newValue`) is **not confirmed** — no schema in `components.schemas` models a generic webhook event envelope (`WorkflowWaitEventPayload`, `StatusChangePart`, `PriorityChangePart` are for the in-app conversation timeline, not the webhook delivery envelope).

**How this package handles it**: the trigger implements HMAC-SHA256 verification defensively — it reads the raw body, computes HMAC-SHA256 keyed with the webhook secret (stripping the `whsec_` prefix if present), and compares it against a configurable header (default `Featurebase-Signature`, editable in the trigger's options) using constant-time comparison. If the header is absent, the request is still accepted (so the trigger keeps working once the real header name is confirmed) but the item is flagged `signatureVerified: false`. This is explicitly documented as best-effort in the README and here, pending Featurebase publishing the Security guide page. For the `changes` array, the trigger reads `changes`/`changedFields`/`diff` (in that order) if present on the payload and degrades gracefully to an empty array if none is present, rather than assuming a shape that isn't confirmed.

## 8. Confirmed write operations

| Operation | In spec? | operationId |
|---|---|---|
| Add upvoter to post | Yes | `addVoter` (`POST /v2/posts/{id}/voters`) |
| Remove upvoter | Yes | `removeVoter` (`DELETE /v2/posts/{id}/voters`) |
| List upvoters | Yes | `listVoters` (`GET /v2/posts/{id}/voters`) |
| Conversation reply | Yes | `replyToConversation` (`POST /v2/conversations/{id}/reply`, `messageType: "reply"`) |
| Conversation note | Yes | same endpoint, `messageType: "note"` |
| Conversation assign (admin/team) | Yes | `updateConversation` (`adminAssigneeId`/`teamAssigneeId`) |
| Conversation close/open/snooze | Yes | `updateConversation` (`state: open\|closed\|snoozed`, `snoozedUntil`) |
| Conversation set priority | **No** | not in `UpdateConversationBody` or any other schema — `priority` is read-only on the `Conversation` object, only settable from the dashboard or implicitly by the `conversation.priority.updated` event. Logged under "Not in spec" below. |
| Help center article create/update | Yes | `createArticle`, `updateArticle` |
| Contact upsert | Yes | `upsertContact` (`POST /v2/contacts`, matches by `userId` then `email`) |
| Survey responses read | Yes | `getSurveyResponses` (`GET /v2/surveys/{id}/responses`) |

### Not in spec
- Conversation "set priority" as a standalone write operation.
- Ticket resource is present in the spec but out of scope (task never asked for it and it postdates the task's scope — see §1); not implemented.
- A dedicated "list post tags" endpoint — see §9.

## 9. Post fields for composite ops

All confirmed on `CreatePostBody`/`UpdatePostBody`/`Post` in `reference/openapi.json`:
- `author`: `AuthorInput` — `id` (Featurebase user ID) > `userId` (external SSO ID) > `email`, plus `name`/`profilePicture`. Priority order as documented: "Supports multiple identification methods: id ..., userId ..., or email."
- `createdAt`: backdating field on create, ISO 8601, "for backdating imports".
- `upvotes`: initial upvotes count, integer ≥ 0, defaults to 1 (author auto-voted); pass `0` to create with none.
- `visibility`: enum `public` | `authorOnly` | `companyOnly`.
- `integrations` (create-time push object): **`linear`, `clickup`, `github`, `jira`, `discord`, `slack`** — all boolean, default false. **Divergence from the task file**: the task listed `linear / jira / clickup / github / devops / hubspot` as the push booleans; the spec's create-time push object does **not** include `devops` or `hubspot`. `devops` and `hubspot` (plus `salesforce`) only appear as **read-only, response-side** arrays on `Post.integrations` (populated by the underlying issue-tracker/CRM sync, not triggerable via this field). The node's Create/Update operations only expose the six booleans the spec actually accepts; the "linked to X" derived-event and the Revenue-Weighted Score composite op read the full response-side `integrations` object (including `hubspot[]` and `devops[]`) since those are read paths.
- `integrations.hubspot[]`: response-only, `{ objectId, type: TICKET|DEAL|CONTACT, dealAmount: number|null, dealClosed: boolean|null }` — exactly as the task assumed.
- `integrations.salesforce[]`: response-only, `{ objectId, objectType: Opportunity|Case, amount, ... }` — bonus, not requested by the task, not used.
- `customFields`: object keyed by custom-field ObjectId, values string/boolean/number/date-string/string-array/null.
- `eta`: ISO 8601 string or null.
- `assigneeId`: admin ObjectId (note: field name is `assigneeId`, not `assignee`).
- `content`: **HTML only** at the API level (`"Post content (HTML)"`) — there is no server-side markdown mode. The Markdown toggle in this package's node converts markdown to HTML client-side (`utils/markdown.ts`) before sending; the API itself never sees markdown for posts/comments. Conversation replies are the opposite: `AdminReplyBody.bodyMarkdown` takes **markdown directly** (server renders it), so the node sends conversation replies as raw markdown without local conversion.
- Bonus fields present in the spec but not called out in the task: `commentsEnabled` (boolean), `notifyAdmins` (boolean, default false — whether to email admins on create).

## 10. List posts filters and sort

Confirmed on `GET /v2/posts` parameters exactly as the task assumed:
- `boardId` (string or string[], ≤50), `statusId` (string or string[], ≤50), `tags` (string or string[], ≤50, by name), `q` (string, ≤255), `inReview` (boolean|null)
- `sortBy`: `createdAt` | `upvotes` | `trending` | `recent` (default `createdAt`)
- `sortOrder`: `asc` | `desc` (default `desc`)
- `limit` (1-100, default 10), `cursor`

No dedicated "list post tags" endpoint exists (`/v2/tags` is the **Conversation Tags** registry, a different object). Per the task's own instruction, the Tags dropdown for post-scoped operations is populated by paging `GET /v2/posts` and collecting distinct `tags[].name` values, cached in `loadOptions`.

## 11. `changes` array on `*.updated` payloads

Not confirmed — see §7. No schema in the spec models this and the docs pages that would describe it (Consuming webhooks, Topic types) were not recoverable. The trigger degrades gracefully rather than assuming a shape.

## 12. Rate limits

Not documented anywhere in the recovered spec or docs (no `429` response object on any operation, no rate-limit guide page recovered). `GenericFunctions.ts` implements exponential backoff with jitter, honouring `Retry-After` if the header is present on a 429, capped at 5 attempts, since the error-handling guide confirms `rate_limit_error` (429) is a real error type even though the numeric limits aren't published.

## 13. Recovery method note

`docs.featurebase.app` returned a live HTTP 402 "Documentation unavailable" for every path tested (root, `/rest-api/posts`, `/llms.txt`, the OpenAPI bundle URL, etc.), verified with two independent fetch paths. All reference material in this repo was instead recovered from the Wayback Machine (`web.archive.org`), preferring the most recent `200`-status snapshot of each URL. The OpenAPI bundle recovered this way parsed as valid JSON, has the exact `info.version` (`2026-01-01.nova`) the task specified, and its `servers[0].url` (after stripping the Wayback rewrite prefix) matches the task's stated base URL (`https://do.featurebase.app`) — treated as sufficiently authoritative to build against. If Featurebase's docs come back online before this package ships, re-fetching `reference/openapi.json` directly and diffing against this file is recommended.
