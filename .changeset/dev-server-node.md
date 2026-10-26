---
"@stdout-design/dev-server": patch
---

The dev server runs on Node, not only Bun. It listens through `@hono/node-server` and serves the web UI with `node:fs`, so `studio dev` works under both runtimes. A port that is already in use still reports a clear error.
