These payloads are constructed for testing, not copied from a confirmed Featurebase source.

`reference/FINDINGS.md` section 7/11 explains why: the "Consuming webhooks" and "Topic types" guide pages that would show real payload shapes were never archived and the live docs site is down. The envelope shape here (`topic`, `id`, `createdAt`, `organizationId`, `data.item`, `data.changes`) is this package's best-effort convention, built from the confirmed `Post`/`Comment`/`Changelog`/`Conversation` object schemas in `reference/openapi.json` plus the task's stated field names. The trigger node itself does not assume this exact envelope; it also tries `type`/`event` for the topic and `data.object`/`data` for the item, and degrades to an empty `changes` array when none is present.

If Featurebase publishes the real payload shape, replace these fixtures and re-run the trigger tests.
