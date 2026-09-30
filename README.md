# Featurebase Connect SDK

An n8n integration for Featurebase, and the SDK it's built on.

## What's in here

### The n8n integration

Featurebase's own feedback board has [an open request for n8n support](https://feedback.featurebase.app/p/support-connecting-and-interacting-with-n8n), 145 upvotes, posted by a Featurebase team member, marked "In Review." This is that integration.

It gives you a trigger that reacts the moment something happens in Featurebase (a new post, a comment, an upvote, a status change) and full coverage of everything Featurebase's API can do: posts, comments, changelogs, boards, contacts, companies, conversations, surveys, help center content, and more. It's published on npm as [n8n-nodes-featurebase-connect](https://www.npmjs.com/package/n8n-nodes-featurebase-connect) and installs from n8n's Community Nodes panel.

See [how to install and use it](integrations/n8n/node/README.md).

### The core SDK

The API client the integration above is built on. Anyone can use it to build another integration on top of Featurebase.

## How it's built

Built directly from Featurebase's own API specification.

Two things happen automatically on every request:

Content formatting. Feedback content (a post description, a comment, a changelog entry) comes back from the API as HTML. A clean plain-text version is generated alongside the original, so anything built on top of it doesn't have to strip HTML tags itself.

Request validation. Before a request reaches the API, it's checked against the API's real schema. A mistake is caught immediately with a clear message instead of failing silently or reaching the API malformed.

Tested against a real Featurebase account.

## License

[MIT](LICENSE)
