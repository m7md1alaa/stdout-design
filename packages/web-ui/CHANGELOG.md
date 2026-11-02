# @stdout-design/web-ui

## 0.8.0

### Minor Changes

- Templates are written with `defineTemplate` (ADR-0019). A template declares its props with `field.*` builders, its fonts by role, and reads direction and type scale from the render context (`ctx.flip`, `ctx.type`, `ctx.fonts`). `@stdout-design/core/template` and `@stdout-design/cli/template` export the API and a small authoring kit (`keyed`, `words`, `Arrow`, `Sparkle`, `halftone`, `starburst`).

  - Locale files replace only the props a template's schema marks as text; colors, numbers and list lengths stay as the template sets them. The studio edits props by the same field kinds.
  - A template's declared fonts load on every locale. A `fonts` block in `studio.config.ts` is now optional and only overrides families, for example with a local file. `studio init` no longer writes one and `studio update` no longer merges fonts.
  - `classifyLocale` is the one place a locale becomes a script (Latin, Arabic or Hebrew) and a direction. It replaces `scriptOf`, which is removed from `@stdout-design/core`. Hebrew locales fall back to Noto Sans Hebrew.
  - The four starters are ported to `defineTemplate`.

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
