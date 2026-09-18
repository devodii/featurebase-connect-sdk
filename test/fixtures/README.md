These payloads are constructed for testing, not copied from a confirmed Featurebase source.

Featurebase's docs never published the real webhook payload shape (the guide pages that would show it aren't available). The envelope shape here (`topic`, `id`, `createdAt`, `organizationId`, `data.item`, `data.changes`) is this package's best-effort convention, built from the confirmed `Post`/`Comment`/`Changelog`/`Conversation` object schemas in `reference/openapi.json`. The trigger node itself does not assume this exact envelope; it also tries `type`/`event` for the topic and `data.object`/`data` for the item, and degrades to an empty `changes` array when none is present.

If Featurebase publishes the real payload shape, replace these fixtures and re-run the trigger tests.
