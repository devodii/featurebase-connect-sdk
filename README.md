# n8n-nodes-featurebase

An n8n community node package for [Featurebase](https://featurebase.app): feedback boards, changelogs, help center, and support conversations. Featurebase's own feedback board has [an open request for this integration](https://feedback.featurebase.app/p/support-connecting-and-interacting-with-n8n) with 145 upvotes, posted by a Featurebase team member and marked "In Review" - this package is the implementation.

## Install

**n8n Cloud or self-hosted with the community nodes panel:**

1. Go to **Settings > Community Nodes**.
2. Select **Install**, enter `n8n-nodes-featurebase`, and confirm.

**Self-hosted with npm:**

```bash
npm install n8n-nodes-featurebase
```

Then restart n8n. See [n8n's community nodes documentation](https://docs.n8n.io/integrations/community-nodes/installation-and-management/) for details specific to your setup (npm, Docker, or a custom image).

## Credentials

1. In Featurebase, go to **Settings > API** and create an API key.
2. In n8n, add a **Featurebase API** credential:
   - **API Key**: the key from step 1.
   - **API Version**: defaults to `2026-01-01.nova`. Sent as the `Featurebase-Version` header on every request; pin it so your workflows keep working across future Featurebase releases.
   - **Base URL**: defaults to `https://do.featurebase.app`. Only change this for a self-hosted or region-specific deployment.

The credential's test calls `GET /v2/boards?limit=1`.

## Trigger node

The Featurebase Trigger node registers a real webhook with Featurebase (not polling) and starts your workflow when an event arrives.

### Topics

| Group         | Topics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Feedback      | `post.created`, `post.updated`, `post.deleted`, `post.voted`                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Changelog     | `changelog.published`                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Comments      | `comment.created`, `comment.updated`, `comment.deleted`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Conversations | `conversation.user.created`, `conversation.user.replied`, `conversation.admin.replied`, `conversation.admin.closed`, `conversation.handover_requested`, `conversation.admin.assigned`, `conversation.admin.noted`, `conversation.admin.snoozed`, `conversation.admin.unsnoozed`, `conversation.admin.opened`, `conversation.priority.updated`, `conversation.deleted`, `conversation.contact.attached`, `conversation.contact.detached`, `conversation.read`, `conversation_part.redacted` |

Ticket topics (`ticket.created`/`updated`/`deleted`) exist in the Featurebase API but are out of scope for this package - see `reference/FINDINGS.md`.

### Filters

Evaluated after Featurebase has already delivered the event, so you don't need a separate IF node: **Board**, **Status Type**, **Status**, **Tag**, **Author Type**, **Minimum Upvotes**.

### Derived events

Higher-level events built on top of the raw topics, using the payload's `changes` array where Featurebase provides one:

| Derived event                       | Use case                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| Status Changed to X                 | Kick off a release or notification flow when a post reaches a specific status (e.g. "Completed") |
| Upvote Threshold Crossed            | Alert the team the first time a post passes a vote count you choose, without repeat alerts       |
| Post Linked to Integration          | React when a post gets linked to Linear, Jira, ClickUp, GitHub, Azure DevOps, or HubSpot         |
| ETA Set or Changed                  | Notify subscribers or update an external roadmap when a target date is set                       |
| Assignee Changed                    | Route work items when a post is assigned, optionally only for a specific admin                   |
| Customer Commented on Assigned Post | Ping the owning admin when their assigned post gets a new customer reply                         |
| AI Handover Requested               | Alert on-call support the moment an AI conversation needs a human                                |

### Output

Every item includes `topic`, `eventId`, `createdAt`, `organizationId`, `webhookId`, `changedFields` (an array of field names from `changes`), `changes` (the raw array), and `contentText` (HTML content stripped to plain text) where applicable. `Flatten` (default on) spreads the event item's own fields to the top level instead of nesting them under `item`. `Include Raw Payload` attaches the untouched webhook body under `raw`.

The exact webhook payload envelope and the `changes` array's field shape are not confirmed by Featurebase's published docs at the time of writing (their guide pages describing it were unavailable - see `reference/FINDINGS.md` section 7). The trigger degrades gracefully: it tries several common field names and falls back to direct field comparison when no `changes` array is present, rather than assuming a shape that might be wrong.

## Action node

| Resource            | Operations                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Post                | Get Many, Get, Get by Slug, Search, Create, Update, Delete, Add Upvoter, Remove Upvoter, Get Upvoters                                                      |
| Comment             | Get Many, Get, Create, Update, Delete                                                                                                                      |
| Changelog           | Get Many, Get, Create, Update, Publish, Unpublish, Delete, Add Subscribers, Remove Subscribers                                                             |
| Board               | Get, Get Many                                                                                                                                              |
| Post Status         | Get, Get Many                                                                                                                                              |
| Custom Field        | Get, Get Many                                                                                                                                              |
| Admin               | Get, Get Many                                                                                                                                              |
| Team                | Get, Get Many                                                                                                                                              |
| Brand               | Get, Get Many                                                                                                                                              |
| Contact             | Get Many, Get, Create or Update, Delete, Block, Unblock                                                                                                    |
| Company             | Get Many, Get, Create or Update, Delete, List Contacts, Attach Contact, Detach Contact                                                                     |
| Conversation        | Get Many, Get, Create, Update (state/assignee/team/title/attributes), Delete, Reply, Add Note, Add Participant, Remove Participant, Attach Tag, Detach Tag |
| Survey              | Get Many, Get, Get Responses                                                                                                                               |
| Help Center Article | Get Many, Get, Create, Update, Delete, plus Collection operations (Get Many, Get, Create, Update, Delete)                                                  |
| Webhook             | Get Many, Get, Create, Update, Delete, Refresh Secret                                                                                                      |

Every ID-shaped field with a list endpoint (board, status, admin, team, brand, custom field, post, comment) is a resourceLocator: pick from a live dropdown or paste an ID directly. `Simplify` trims Get/Get Many responses to the fields most workflows need. Post, Comment, and Changelog outputs always include `contentText`. The `Markdown` toggle (on by default for Post/Comment) converts markdown input to HTML client-side before sending, since Featurebase's API stores that content as HTML; Changelogs and Conversation replies accept markdown natively, so no conversion happens there.

## Workflow Helpers

Composite operations under the **Workflow Helper** resource that combine multiple API calls into one node:

- **Upsert Feedback**: searches existing posts by title, scores matches with a token-overlap similarity check, and either upvotes + comments on a close match or creates a new post. The dedupe layer for a support-ticket-to-feedback pipeline (see `templates/support-ticket-to-feedback-upsert.json`).
- **Revenue-Weighted Score**: reads a post's (or a query's) `integrations.hubspot[]` deals, splits them into open pipeline and closed revenue, and returns `arrWeight = upvotes + openPipeline / divisor` - useful for a "top 10 by revenue" digest (see `templates/weekly-trending-digest.json`).
- **Bulk Import**: accepts a JSON array of `{ title, content, board, authorEmail, authorName, createdAt, upvotes, status, tags }` rows, resolves board/status names to IDs once, and creates each post with backdating and initial upvotes - reporting per-row success/failure without aborting the batch. The migrate-from-Canny path (see `templates/canny-migration.json`).
- **Set Status with Changelog Draft**: updates a post's status and ETA, then creates a matching draft changelog pre-filled from the post's title and content (see `templates/status-completed-to-linear-and-changelog.json`).

## Templates

Real n8n workflow exports in `templates/`, built with this package's nodes. Import any of them from n8n's **Workflows > Import from File** menu.

### `high-vote-post-to-slack.json`

`![screenshot placeholder]`

Upvote Threshold Crossed (25) trigger to a Slack message with title, board, upvotes, and link.

### `status-completed-to-linear-and-changelog.json`

`![screenshot placeholder]`

Status Changed to Completed trigger, sets status and drafts a changelog, then comments on the linked Linear issue if one exists.

### `weekly-trending-digest.json`

`![screenshot placeholder]`

Scheduled Monday 09:00, pulls the top 10 trending posts, scores them by revenue, and posts a digest to Slack.

### `support-ticket-to-feedback-upsert.json`

`![screenshot placeholder]`

Zendesk/Intercom webhook on a "feature-request" tag to Upsert Feedback, attributed to the requester's email.

### `ai-handover-to-slack.json`

`![screenshot placeholder]`

AI Handover Requested trigger to a Slack mention.

### `canny-migration.json`

`![screenshot placeholder]`

Reads a Canny CSV export, maps its columns, and runs Bulk Import.

## Webhooks, limits, and rate limits

- Featurebase allows a maximum of **10 webhook endpoints per organization**. If activating the trigger fails because you're at the limit, delete an old endpoint first (Featurebase dashboard, or this package's Webhook resource) - the trigger surfaces this as a clear error rather than a raw API failure.
- Featurebase signs outbound webhooks with a secret prefixed `whsec_...`, generated when a webhook is created. The exact signature header name and algorithm are not confirmed by Featurebase's currently published docs (see `reference/FINDINGS.md` section 7); the trigger verifies HMAC-SHA256 against a `Featurebase-Signature` header when present. If that header is present but does not match, the request is rejected with a 401. If the header is absent entirely (the live behavior is unconfirmed), the request is still processed and marked `signatureVerified: false`, since rejecting every request outright would break the trigger for everyone until Featurebase confirms the real header name.
- Numeric rate limit thresholds are not published. The node retries on `rate_limit_error` (HTTP 429) with exponential backoff and jitter, honouring `Retry-After` when present, up to 5 attempts before failing.

## Monorepo

This repository is also home to the Featurebase Connect SDK, a headless, OpenAPI-driven toolkit for building typed Featurebase integrations beyond n8n:

| Package          | What it is                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/types` | TypeScript types generated from `reference/openapi.json`, plus generics like `ExtractBody<TOp>` and `ExtractResponse<TOp>` keyed by operationId.                                                                    |
| `packages/core`  | A platform-agnostic API client: a generic `FeaturebaseClient.execute<TOp>`, cursor pagination, retry with backoff, and a typed hook engine. Takes an injected fetcher, so it works in n8n, a CLI, or anywhere else. |
| `packages/cli`   | Codegen tooling: parses the OpenAPI spec and turns JSON Schema into Zod schema source, for generating typed integrations from a manifest.                                                                           |

This n8n package (the root of this repository) does not yet consume the SDK; that migration is a planned next step. Uncertain runtime behavior (rate limit thresholds, retry-after semantics) is tagged `@unchecked-*` in the source rather than assumed.

## Development

```bash
npm install
npm run build     # compile and copy static assets
npm run dev        # watch mode
npm run lint        # n8n-nodes-base + community-node lint rules
npm run lintfix
npm run format      # prettier --write .
npm test            # jest
npm run format:push # format, lint --fix, typecheck, commit, and push
```

The SDK packages use pnpm:

```bash
pnpm install
pnpm --filter "./packages/**" run typecheck
pnpm --filter "./packages/**" run test
```

`reference/` holds everything this package was built from: the OpenAPI spec (`openapi.json`), recovered docs pages, and `FINDINGS.md`, which records every place the spec and this README's claims come from, plus every documented gap. Anything not backed by that spec was deliberately left out rather than guessed.

## Contributing

Issues and pull requests are welcome. Please check `reference/FINDINGS.md` first if you're adding a new field or operation - if it's not in `reference/openapi.json`, it needs to be re-verified against the live API before it's added here.

## License

[MIT](LICENSE)

## For the Featurebase team

This package exists because of [your own feedback board's most-upvoted integration request](https://feedback.featurebase.app/p/support-connecting-and-interacting-with-n8n). It's offered for adoption as the official n8n integration: every operation is traceable to `reference/openapi.json`, the documented gaps are called out rather than papered over, and the repository and npm package are both ready to transfer. Reach out via a GitHub issue on this repo if you'd like to take it over.
