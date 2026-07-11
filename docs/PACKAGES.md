# Package consumption guide

## Just want the CLI?

Install `@stdout-design/cli`. You get `@stdout-design/core` and
`@stdout-design/dev-server` as transitive runtime dependencies automatically;
you never need to install or import them yourself.

```
bun add -d @stdout-design/cli
studio render my-template --title "Hello"
```

## Building your own front door

Install `@stdout-design/core` directly. Import only what's publicly exported:

```typescript
import {
  RenderCache,
  compileTemplate,
  renderToPixels,
  measureTemplate,
  runBatch,
  loadConfig,
  expandMatrix,
  defineSchema,
  studioConfigSchema,
  zodToJsonSchemaShape,
} from "@stdout-design/core";
```

Nothing under the cache internals (`FsStore`, `MetadataStore`, `EvictionCoordinator`,
`ConcurrencyLimiter`, `CompileCache`) is importable, by design. All cache access
goes through `RenderCache`.

## Installing `@stdout-design/dev-server` directly

You should not install `@stdout-design/dev-server` directly unless you're
building an alternative live-preview UI to `web-ui`. It exists to be driven
by `@stdout-design/cli`'s `studio dev` command, not consumed standalone.
