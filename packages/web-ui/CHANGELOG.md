# @stdout-design/web-ui

## 0.7.1

No changes in this release.

## 0.7.0

No changes in this release.

## 0.6.0

No changes in this release.

## 0.5.0

### Minor Changes

- Align the version with `@stdout-design/cli`, `core` and `dev-server` (0.5.0). No code changes since 0.4.2.

## 0.4.2

### Patch Changes

- 49901fa: Update all dependencies to their latest versions, including chokidar 6, framer-motion 14, TanStack Hotkeys 0.18 and Vite 8.3.

  Takumi 2.17: `registerFont` now forwards its abort signal correctly (Takumi inserted a `key` parameter) and resolves to family-name strings as typed, and stylesheets are sent to Takumi as `css` instead of the deprecated `stylesheets` field.

  **Breaking:** `@stdout-design/cli`, `@stdout-design/core` and `@stdout-design/dev-server` now require Node.js 22.22 or later (declared in `engines`), because chokidar 6 and better-sqlite3 13 dropped older Node versions.

## 0.4.0

### Minor Changes

- Introduce a comprehensive UI component library (buttons, dialogs, select, slider, tabs, toast, color picker, autocomplete, and more), a keyboard shortcut/command palette system, and state persistence and sharing for the studio. Extract app state and render/prop logic into hooks, standardize the package structure, and improve theming and shortcut binding.
