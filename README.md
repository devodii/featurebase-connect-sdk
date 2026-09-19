# featurebase-connect-sdk

Everything for building [Featurebase](https://featurebase.app) integrations, in one repository.

| Path                    | What it is                                                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| `integrations/n8n/node` | The published n8n community node (`n8n-nodes-featurebase`). See [its README](integrations/n8n/node/README.md). |
| `integrations/n8n`      | A small, hand-written example of using the SDK below to talk to Featurebase from n8n.                          |
| `packages/types`        | TypeScript types generated from `reference/openapi.json`, plus generics like `ExtractBody<TOp>`.               |
| `packages/core`         | A platform-agnostic API client: `FeaturebaseClient.execute<TOp>`, cursor pagination, retry with backoff.       |
| `reference/`            | The OpenAPI spec and recovered docs everything else in this repo is built from.                                |

Adding a new integration (say, Slack) means creating `integrations/slack/` with the same pattern `integrations/n8n` shows: a plain object mapping operationId to method and path, a couple of hand-written Zod schemas, and a client wiring them into `packages/core`. No code generator, no manifest file, no build step.

## Development

This is a pnpm workspace. The n8n node itself (`integrations/n8n/node`) is deliberately excluded from it and published with npm, since it must ship with zero runtime dependencies - see its own README for its commands.

```bash
pnpm install
pnpm -r --filter "./packages/**" --filter "./integrations/n8n" run typecheck
pnpm -r --filter "./packages/**" --filter "./integrations/n8n" run test
```

## License

[MIT](LICENSE)
