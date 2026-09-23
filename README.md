# featurebase-connect-sdk

Everything for building [Featurebase](https://featurebase.app) integrations, in one repository.

| Path                    | What it is                                                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `integrations/n8n/node` | The published n8n community node (`n8n-nodes-featurebase`). See [its README](integrations/n8n/node/README.md).                                                                                                            |
| `integrations/n8n`      | A small, hand-written example of using the SDK below to talk to Featurebase from n8n.                                                                                                                                     |
| `integrations/notion`   | A real, working Featurebase-to-Notion sync: reads posts and boards from Featurebase, upserts them into a Notion database. See [its README](integrations/notion/README.md) for setup.                                      |
| `packages/core`         | A platform-agnostic API client: `FeaturebaseClient.execute<TOp>`, cursor pagination, retry with backoff, plus types generated from `reference/openapi.json` (`Types.components`, generics like `Types.ExtractBody<TOp>`). |
| `reference/`            | The OpenAPI spec and recovered docs everything else in this repo is built from.                                                                                                                                           |

Adding a new integration means creating `integrations/<name>/` with the pattern `integrations/n8n` and `integrations/notion` both show: `operations.ts` (a plain object mapping operationId to method and path), `schemas.ts` (hand-written Zod schemas for the operations that take a body), and `client.ts` (wires both into `packages/core`'s `FeaturebaseClient`). No code generator, no manifest file, no build step.

## Development

This is a pnpm workspace. The n8n node itself (`integrations/n8n/node`) is deliberately excluded from it and published with npm, since it must ship with zero runtime dependencies - see its own README for its commands.

```bash
pnpm install
pnpm -r --filter "./packages/**" --filter "./integrations/*" run typecheck
pnpm -r --filter "./packages/**" --filter "./integrations/*" run test
```

## License

[MIT](LICENSE)
