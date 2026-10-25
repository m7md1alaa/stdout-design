# @stdout-design/dev-server

## 0.5.0

### Minor Changes

- 49901fa: Update all dependencies to their latest versions, including chokidar 6, framer-motion 14, TanStack Hotkeys 0.18 and Vite 8.3.

  Takumi 2.17: `registerFont` now forwards its abort signal correctly (Takumi inserted a `key` parameter) and resolves to family-name strings as typed, and stylesheets are sent to Takumi as `css` instead of the deprecated `stylesheets` field.

  **Breaking:** `@stdout-design/cli`, `@stdout-design/core` and `@stdout-design/dev-server` now require Node.js 22.22 or later (declared in `engines`), because chokidar 6 and better-sqlite3 13 dropped older Node versions.

### Patch Changes

- Updated dependencies [49901fa]
  - @stdout-design/core@0.5.0

## 0.4.0

### Minor Changes

- Wire font and image resolution from studio config into render/measure requests, and clear font/render caches on full config reload. Fix `/cache/stats` to await the async cache stats call, and change the default dev server port to 3030.

### Patch Changes

- Updated dependencies
  - @stdout-design/core@0.4.0
