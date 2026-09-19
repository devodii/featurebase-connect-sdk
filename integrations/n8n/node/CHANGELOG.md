# Changelog

All notable changes to this project are documented in this file.

## [0.1.0]

Initial release.

### Added

- `FeaturebaseApi` credential with an API key, a pinned API version header, and a configurable base URL for self-hosted deployments.
- `Featurebase` action node covering Post, Comment, Changelog, Board, Post Status, Custom Field, Admin, Team, Brand, Contact, Company, Conversation, Survey, Help Center Article, and Webhook resources.
- Four Workflow Helper composite operations: Upsert Feedback, Revenue-Weighted Score, Bulk Import, and Set Status with Changelog Draft.
- `Featurebase Trigger` node: real webhook registration and lifecycle management, all 26 confirmed webhook topics, event filters, seven derived events, event deduplication, and best-effort signature verification.
- Zero-dependency utilities for markdown-to-HTML conversion, HTML-to-text stripping, title similarity scoring, and HMAC-SHA256 signing.
- Six workflow templates in `templates/`.
- `reference/openapi.json` and `reference/FINDINGS.md`, documenting every operation's source and every known gap in Featurebase's published docs.
