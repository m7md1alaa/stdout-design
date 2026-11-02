# 0020. Studio redesign: toolbar, fitted canvas, right inspector, one token layer

## Status

Accepted. Builds on ADR-0019 (the studio reads field kinds from `x-field`; this ADR adds field labels, hints, and an inspector layout on top).

## Context

An audit of `packages/web-ui` found that the studio feels broken in use, and that most of it comes from a few causes rather than many small ones.

**The preview flickers on every edit.** `useRenderPreview` sets `{ status: "loading", url: "" }` before each render (`hooks/use-render-preview.ts`), and `Canvas` swaps the image for the text "Rendering..." while loading. Each keystroke, after the 200 ms debounce, makes the artwork vanish and come back.

**The props panel shows the schema, not a form.**

- The label is `schema.description`, so fields read "Accent for the solid tiles, chart, and gauge" instead of "Accent color".
- Fields appear in schema key order, which is alphabetical because Ultracite's sort-keys rule sorts every object literal, templates included. A 20-field template such as `bento-feature` is one list in A–Z order with no grouping.
- String lists are rounded, indigo chips: items cannot be edited in place or reordered, only deleted and retyped. Number lists replace the whole array on Enter (`[30, 45, 25, 60]` + `5` gives `[5]`), while string lists append.
- Clearing a number input sets it to `0` (`Number("")`). Range sliders hardcode `step={1}` and offer no typed value.
- Object lists show every item expanded in its own bordered box, with no summary and no reordering.
- The only reset is a reset-all shortcut; nothing shows which fields differ from their defaults.

**Settings are presented as navigation.** Locale and preset are two stacked full-width tab bars, though both are values, not views. The preset name and size are repeated above the canvas. The template picker shows ids only, though each template has a description. Shortcut hints appear only while ⌘ is held.

**The canvas ignores the window.** It fits a fixed 800×600 box (`canvas.tsx`), with no zoom.

**Three token systems run side by side.** App code uses `--color-surface*` / `--color-content*`; `components/ui/` uses shadcn tokens (`bg-input/32`, `bg-popover`); the color picker alone uses an eight-step `--surface-1..8` scale whose `:root` values are light-mode. Adjacent controls disagree: the multiline textarea uses the `field-input` utility (3 px radius, `text-xs`) next to an `Input` with `rounded-lg` and `text-sm`. The accent is indigo `#6366f1`, which competes with the user's artwork. Section labels are small uppercase letter-spaced text.

**Dead weight.** `components/ui/color-picker.tsx` is 2,789 lines and is the sole user of `framer-motion`, `use-proximity-hover`, `Elevated`, and the surface, icon, shape, and size contexts; it offers hex/rgb/hsl/oklch switching for fields that store hex. `@radix-ui/react-slider`, `@radix-ui/react-tooltip`, and `@fontsource-variable/geist` are installed and never imported.

## Decision

### 1. Layout: toolbar, canvas, right inspector

The studio follows the layout design tools already taught people (Figma, Framer, Sketch): a toolbar on top, the canvas in the middle, the inspector on the right.

- **Toolbar (44 px).** Template switcher (a popover listing each template's name and description; ⌘K still opens the palette), preset select (`og · 1200×630`), locale select, a render-status spinner, a copy-link icon button, and Export as the primary button at the far end.
- **Removed:** the brand block and its pulsing reload dot, both tab bars, the preset label above the canvas, and the ⌘-hold hint row. Shortcuts appear in tooltips (`Export ⌘E`) and menus.
- **Export menu:** PNG at 1× and 2×, copy image to clipboard, export every preset.

### 2. Canvas

- **The last good frame stays on screen while the next one renders.** `RenderPreviewState` keeps the previous `url` during `loading`; progress shows as a 2 px line at the top of the canvas, never as text in place of the image.
- **Fit to the available space**, measured with `ResizeObserver`, with zoom (Fit, 100%, ⌘+, ⌘−) and a status bar showing dimensions and zoom.
- **Render errors overlay the last good frame** as a bar, and each issue with a `path` is also shown on its field in the inspector.

### 3. Inspector

- **Label and hint.** The label is the field key in sentence case (`accentColor` → "Accent color"); `description` becomes a hint under the control.
- **Rows.** Color, number, boolean, and short select fields use one row: label on the left, control on the right. Text fields keep the label above.
- **Color.** One control: the swatch sits inside the hex input; clicking it opens a picker with a saturation square, hue, eyedropper, hex input, and a row of the colors already used in this template. It replaces `color-picker.tsx`, with a target of about 400 lines.
- **Number.** Slider plus a typed number input; dragging on the label scrubs the value. `step` comes from the schema (`multipleOf`), defaulting to 1 for integers. An empty input keeps the last valid value instead of writing `0`.
- **Select.** A segmented control for four or fewer short options, a select otherwise.
- **String and number lists** replace the chips: one editable input per item, a drag handle, remove on hover, and "Add" at the end. Both list types append and edit the same way.
- **Object lists** are collapsed rows with a one-line summary built from the item's first text fields (`Coffee · 4.50`). One row is open at a time; rows reorder by drag; a row menu offers Duplicate and Delete; the header shows the count against `maxItems` (`3 of 6`).
- **Per-field reset.** A dot beside the label marks a value that differs from its default; clicking it resets that field.

### 4. Inspector layout is declared by the template

`defineTemplate` gains an optional `inspector` list that names the groups and the order of fields in each, typed against the schema's keys:

```ts
defineTemplate({
  schema,
  inspector: [
    ["Content", ["headline", "description", "brand"]],
    ["Colors", ["accentColor", "background"]],
    ["Receipt", ["receipt", "receiptNote"]],
  ],
  render,
});
```

`field.*` options also gain an optional `label`, stored in `FieldMeta` and sent through `x-field`, for keys that do not read well in sentence case.

dev-server sends `inspector` with the template's JSON schema. A field the list omits goes to a trailing "Other" group. A template without `inspector` falls back to grouping by kind (text, colors, numbers and toggles, lists), so existing templates improve with no edit. Naming an unknown key, or a key twice, is a type error.

### 5. One token layer and neutral chrome

- **shadcn's semantic tokens are the only tokens** (`background`, `card`, `popover`, `muted`, `border`, `input`, `primary`, `destructive`, `ring`), with values set once in `index.css`. Deleted: `--color-surface*`, `--color-content*`, the indigo accent, and the `field-input`, `range-slider`, and `select-chevron` utilities. The color picker is the only user of `--surface-1..8` with its shadow scale, `Elevated`, `surface-context`, and `surface-classes`, so those go with the picker in slice 5; until then they sit in `index.css` under a note naming that owner.
- **No accent color in the chrome.** The existing zinc neutrals stay; the primary button is near-white with dark text. Color is reserved for errors and the focus ring, so the template is the only colorful thing on screen.
- **Type.** Geist Variable for UI text and Geist Mono for dimensions and values, with tabular numbers. Group headings are sentence case, 12 px, medium weight; no uppercase letter-spaced labels.
- **Shape and motion.** 6 px radius on controls, 8 px on popovers, 1 px borders, shadows only on popovers and menus. Transitions animate color and opacity only, 120–150 ms.

### 6. Dependencies

Remove `@radix-ui/react-slider` and `@radix-ui/react-tooltip`. Import `@fontsource-variable/geist` and add `@fontsource-variable/geist-mono`. Remove `framer-motion` with the old color picker (slice 5), along with `use-proximity-hover` and the icon, shape, and size contexts.

## Consequences

**Positive**

- Editing feels continuous: the artwork never disappears while typing.
- Templates read as forms with plain labels in an order the author chose.
- List content can be edited, reordered, and duplicated in place, and the two list kinds behave alike.
- One token vocabulary means a control looks the same wherever it sits; about 3,000 lines and three dependencies leave the package.

**Negative / risk**

- `inspector` on `defineTemplate` and `label` on `field.*` are new public options, API surface core must keep until 1.0. Keys are typed, but a renamed field still needs the list updated (the type error points at it).
- Labels derived from keys depend on good key names; `bg` becomes "Bg" unless the template sets `label`.
- The rewritten color picker drops rgb/hsl/oklch entry; anyone who typed `oklch(...)` into a color field loses that input path (the field stores hex today, so nothing persisted changes).
- Drag-to-reorder needs keyboard equivalents (move up / move down in the row menu) to stay accessible.

## Rollout

Six slices, each landing alone:

1. **Fixes:** keep the last frame while rendering; labels from keys with description as hint; number-list append; empty number input; schema `step`; canvas fit to available space.
2. **Tokens and dead code:** one token layer, neutral primary, Geist and Geist Mono, a `Textarea` in place of the `field-input` utility, popups at 8px; delete the unused Radix packages and scaffold assets. What only the old color picker uses stays until slice 5.
3. **Shell:** toolbar, template popover, preset and locale selects, export menu, zoom and status bar.
4. **Inspector:** row layout, list editor, object-list rows, per-field reset, errors on fields.
5. **Core and picker:** `inspector` on `defineTemplate` and `label` on `field.*`, both through dev-server; port the four starters; the new color picker.
6. **Later:** an all-presets grid view, side-by-side locale compare (for example `en` next to `ar`), and clicking the canvas to focus the field that drives a region (needs the renderer to report regions).

### Landed differently from the plan

- **Export at 2×** is not in the export menu. The render request has no scale option in core or dev-server, so the menu offers PNG at 1×, copy image, and export all presets. Adding it needs a `scale` through the request schema, the cache key and the renderer.
- **Slice 6** shipped the all-presets grid and the side-by-side locale compare (a View switch in the toolbar). Clicking the canvas to focus a field is still open: it needs the renderer to report which region each prop draws.

## Alternatives Considered

**Inspector on the left, where the props panel is today.** Rejected: design tools put the inspector on the right and navigation on the left, and with four templates there is no list large enough to need a left rail; the toolbar popover and ⌘K cover switching.

**Per-field `group` and `order` options (`field.text("…", { group: "Content", order: 2 })`).** Rejected: group order would still be undefined, numeric `order` values collide and drift as fields are added, and the layout would be scattered across the schema. One typed list states the whole layout in one place.

**Turning off sort-keys for template schemas so key order becomes display order.** Rejected: it relies on a lint exception every template must carry, and still gives no groups.

**Keeping chips for string lists and adding click-to-edit.** Rejected: chips suit short tokens and filters; list items here are sentences and line items that need full-width editing and reordering.

**Keeping the current color picker and trimming it.** Rejected: its size comes from its own surface, motion, and context system, which is the second design system this ADR removes; trimming would keep the dependency graph.
