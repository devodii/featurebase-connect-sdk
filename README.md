# Featurebase Connect

Integrations that let Featurebase connect to the tools you already use, without writing code.

## What's in here

### 1. An n8n integration

Featurebase's own feedback board has [an open request for n8n support](https://feedback.featurebase.app/p/support-connecting-and-interacting-with-n8n), 145 upvotes, posted by a Featurebase team member, marked "In Review." This is that integration.

It gives you a trigger that reacts the moment something happens in Featurebase (a new post, a comment, an upvote, a status change) and full coverage of everything Featurebase's API can do: posts, comments, changelogs, boards, contacts, companies, conversations, tickets, surveys, help center content, and more. It's published on npm and installs from n8n's Community Nodes panel, so nobody using it needs to open this repository.

See [how to install and use it](integrations/n8n/node/README.md).

### 2. A Notion sync

Mirrors your Featurebase feedback into a Notion database on a schedule. Add a few credentials as GitHub secrets and it runs on its own.

See [how to set it up](integrations/notion/README.md).

### 3. The core SDK

The API client both integrations above are built on. Anyone can use it to build another integration on top of Featurebase.

## How it's built

Built directly from Featurebase's own API specification.

Two things happen automatically on every request:

Content formatting. Feedback content (a post description, a comment, a changelog entry) comes back from the API as HTML. A clean plain-text version is generated alongside the original, so anything built on top of it doesn't have to strip HTML tags itself.

Request validation. Before a request reaches the API, it's checked against the API's real schema. A mistake is caught immediately with a clear message instead of failing silently or reaching the API malformed.

Both integrations have been tested against real Featurebase and Notion accounts.

## License

[MIT](LICENSE)
