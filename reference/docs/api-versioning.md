# API Versioning

This API uses **date-based versioning**. Each version is identified by a release date and slug, e.g., `2026-01-01.nova`.

**Specifying a Version**

Include the version in the request header:

```
Featurebase-Version: 2026-01-01.nova
```

Or set a default version for your organization in the dashboard settings.

**Version Compatibility**

- **Newer versions** may add new fields to responses (always backwards-compatible)
- **Breaking changes** (removed/renamed fields, changed behavior) only occur in new versions
- **Your integration will continue to work** as long as you pin to a specific version

