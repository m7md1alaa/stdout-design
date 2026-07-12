# 0007. Extract Asset Resolution as its own core module, with validate-after-merge as a hard contract

## Status

Proposed

## Context

Font loading and locale merging are two axes of the same underlying concern
— "given a locale, what changes about this render" — and are currently
solved twice in two packages:

- `packages/core/src/batch/batch.ts`'s `resolveArabicFonts` fetches Google
  Fonts for Arabic locales, with a same-shape-but-not-shared fallback path.
- `packages/core/src/batch/matrix.ts`'s `mergeLocale` and
  `packages/dev-server/src/index.ts`'s `applyLocale` are independent
  reimplementations of the same locale-merge algorithm (only override a prop
  if the locale value's type matches the existing prop's type).
- `packages/core/src/batch/render-one.ts` independently derives a BCP-47
  `lang` tag from the locale id (`locale?.startsWith("ar") ? "ar" :
  undefined`) — a third, separate copy of "is this locale Arabic-shaped."

One of these copies already has a live bug: dev-server's `applyLocale` runs
**after** `templateModule.propsSchema.safeParse(props)` has already
validated and returned `validatedProps`. Locale JSON is merged into that
already-validated object with no re-validation. A malformed or
wrong-typed value in `locales/ar.json` will silently reach the renderer
instead of producing a 400, even though the endpoint's contract implies
"if you got past validation, what renders matches your schema."

Separately, `resolveArabicFonts` is called once per batch run, gated on
"does *any* locale in this run start with `ar`," and the resulting font set
is then applied to every cell regardless of that cell's own locale — so a
batch mixing `en` and `ar` locales currently ships Arabic font data into the
`en` renders too.

## Decision

`packages/core/src/assets/` becomes the single owner of:

- Locale-file loading and the merge algorithm (one implementation, used by
  both CLI batch and dev-server, replacing `mergeLocale` and `applyLocale`).
- Font and `lang` resolution per locale, with the fetch function injected
  (matching the existing `FsPrimitives` injection pattern in
  `packages/core/src/node/fs-store.ts`) so tests don't need network access.
- A single locale-classification rule (replacing the two independent
  `startsWith("ar")` checks) as the one place "does this locale need special
  handling" is decided.

The module's output contract is explicit:

```ts
resolveAssetsForLocale(localeId: string, props: Record<string, unknown>):
  Promise<{ props: Record<string, unknown>; fonts: Font[]; fontFamilies?: string[]; lang?: string }>
```

`props` on the output is the merged result, and it is what gets validated —
**never** the pre-merge props. Validation happens exactly once, after
merge, inside the render orchestrator (ADR-0009), not before merge in the
caller.

Resolution is memoized **per locale id**, not once per batch run, so
per-cell font sets are correct without re-fetching Google Fonts per row.

## Consequences

**Positive**

- Closes the dev-server post-merge-validation bug and the dev-server
  Arabic-font gap in one change, since both endpoints route through the
  orchestrator, which routes through this resolver.
- Fixes the batch cross-contamination bug (wrong locale's fonts applied to
  a cell) as a natural consequence of resolving per-locale instead of
  per-run.

**Negative / risk**

- Per-locale resolution is a behavior change from "resolve once per run,"
  not a pure refactor — needs its own in-resolver cache to stay as cheap as
  today's once-per-run call.
- Fetch-failure fallback behavior needs an explicit decision as part of this
  work: whether to keep the current placeholder (a zero-byte font
  descriptor, which is not really "safe," just non-throwing) or change it to
  return an empty font set and let the renderer's own default font handling
  take over, logged but not faked. This changes rendering output on network
  failure and should not be inherited silently.

## Alternatives Considered

**Keep fonts and locale-merge as separate modules.** Rejected: they're
both "per-locale render-input resolution," and the `lang` derivation bug
specifically exists because the two concerns are handled in different files
that don't share state — consolidating removes the seam where they drifted.
