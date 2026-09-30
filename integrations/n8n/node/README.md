# n8n-nodes-featurebase-connect

Connects Featurebase to n8n, the automation tool that plugs into many other apps: Slack, email, databases, spreadsheets, and more. Once installed, you can build automations like "when a customer submits feedback, notify the team in Slack" or "when a post crosses 50 upvotes, create a task," without writing code.

Featurebase's own feedback board has [an open request for exactly this](https://feedback.featurebase.app/p/support-connecting-and-interacting-with-n8n), 145 upvotes, posted by a Featurebase team member, marked "In Review." This package is that integration, tested against a real Featurebase account, and this repository is ready to transfer to the Featurebase team.

## Install

If you're on n8n Cloud or self-hosted n8n with the community nodes panel:

1. In n8n, go to Settings, then Community Nodes.
2. Click Install, type `n8n-nodes-featurebase-connect`, confirm.

If you self-host n8n via npm instead:

```bash
npm install n8n-nodes-featurebase-connect
```

Then restart n8n. n8n's own guide covers the npm/Docker specifics: https://docs.n8n.io/integrations/community-nodes/installation-and-management/

## Connect your Featurebase account

1. In Featurebase, go to Settings, then API, and create an API key.
2. In n8n, add a Featurebase API credential and paste that key in.

Every Featurebase node in your workflows can now use it.

## What you can automate

The Trigger node watches Featurebase and starts a workflow when something happens:

| Category      | Events                                                 |
| ------------- | ------------------------------------------------------ |
| Feedback      | New post, post updated or deleted, post upvoted        |
| Comments      | New comment, comment updated or deleted                |
| Changelog     | Changelog published                                    |
| Conversations | New message, replies, handovers, assignments, and more |

You can also react to higher-level moments:

| When this happens                                             | You could                                |
| ------------------------------------------------------------- | ---------------------------------------- |
| A post crosses a vote count you choose                        | Alert the team the first time it happens |
| A post's status changes to something specific, e.g. Completed | Kick off a release announcement          |
| A post gets linked to Linear, Jira, GitHub, HubSpot, etc.     | React in that other tool                 |
| A target date is set on a post                                | Notify whoever's waiting on it           |
| An AI conversation needs a human                              | Alert whoever's on call                  |

## What you can do

The Action node covers Posts, Comments, Changelogs, Boards, Admins, Teams, Contacts, Companies, Conversations, Surveys, Help Center content, Webhooks, and more: create, read, update, delete, search, in any workflow.

There are also four shortcuts that combine several steps into one:

- Upsert Feedback: finds a similar existing post and upvotes or comments on it instead of creating a duplicate.
- Revenue-Weighted Score: ranks feedback by how much paying-customer revenue is behind it.
- Bulk Import: brings in feedback from a spreadsheet or another tool, e.g. migrating from Canny.
- Set Status with Changelog Draft: marks a post done and drafts its changelog entry at the same time.

## Example workflows you can import

Working example workflows live in `templates/`. Import any of them from n8n's Workflows menu, then Import from File.

- High-vote post to Slack: alerts the team the first time a post crosses 25 upvotes.
- Status completed to Linear and changelog: when a post is marked done, drafts its changelog and comments on the linked Linear issue.
- Weekly trending digest: every Monday morning, posts the top 10 trending requests, weighted by revenue, to Slack.
- Support ticket to feedback: turns a tagged Zendesk or Intercom conversation into tracked feedback.
- AI handover to Slack: pings the team when an AI conversation needs a human.
- Canny migration: imports a CSV export from Canny.
- Featurebase to Notion sync: mirrors your feedback into a Notion database on a schedule, no coding or hosting needed.

## Good to know

Featurebase allows up to 10 webhook endpoints per organization. If you hit that limit, delete an old one first.

If Featurebase is temporarily unavailable or rate-limited, this integration retries automatically with backoff instead of failing your workflow.

## Questions or issues

Open a GitHub issue on this repository.

## License

[MIT](LICENSE)
