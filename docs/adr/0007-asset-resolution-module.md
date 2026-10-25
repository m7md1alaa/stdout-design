# 0007. Extract Asset Resolution as its own core module, with validate-after-merge as a hard contract

## Status

Accepted

## Context

Font loading and locale merging are two axes of the same underlying concern — "given a locale, what changes about this render" — and are currently solved twice in two packages:

- `packages/core/src/batch/batch.ts`'s `resolveArabicFonts` fetches Google Fonts for Arabic locales, with a same-shape-but-not-shared fallback path.
- `packages/core/src/batch/matrix.ts`'s `mergeLocale` and `packages/dev-server/src/index.ts`'s `applyLocale` are independent reimplementations of the same locale-merge algorithm (only override a prop if the locale value's type matches the existing prop's type).
- `packages/core/src/batch/render-one.ts` independently derives a BCP-47 `lang` tag from the locale id (`locale?.startsWith("ar") ? "ar" : undefined`) — a third, separate copy of "is this locale Arabic-shaped."

One of these copies already has a live bug: dev-server's `applyLocale` runs **after** `templateModule.propsSchema.safeParse(props)` has already validated and returned `validatedProps`. Locale JSON is merged into that already-validated object with no re-validation. A malformed or wrong-typed value in `locales/ar.json` will silently reach the renderer instead of producing a 400, even though the endpoint's contract implies "if you got past validation, what renders matches your schema."

Separately, `resolveArabicFonts` is called once per batch run, gated on "does _any_ locale in this run start with `ar`," and the resulting font set is then applied to every cell regardless of that cell's own locale — so a batch mixing `en` and `ar` locales currently ships Arabic font data into the `en` renders too.

## Decision

`packages/core/src/assets/` becomes the single owner of:

- Locale-file loading and the merge algorithm (one implementation, used by both CLI batch and dev-server, replacing `mergeLocale` and `applyLocale`).
- Font and `lang` resolution per locale, with the fetch function injected (matching the existing `FsPrimitives` injection pattern in `packages/core/src/node/fs-store.ts`) so tests don't need network access.
- A single locale-classification rule (replacing the two independent `startsWith("ar")` checks) as the one place "does this locale need special handling" is decided.

The module's output contract is explicit:

```ts
resolveAssetsForLocale(localeId: string, props: Record<string, unknown>):
  Promise<{ props: Record<string, unknown>; fonts: Font[]; fontFamilies?: string[]; lang?: string }>
```

`props` on the output is the merged result, and it is what gets validated — **never** the pre-merge props. Validation happens exactly once, after merge, inside the render orchestrator (ADR-0009), not before merge in the caller.

Resolution is memoized **per locale id**, not once per batch run, so per-cell font sets are correct without re-fetching Google Fonts per row.

## Consequences

**Positive**

- Closes the dev-server post-merge-validation bug and the dev-server Arabic-font gap in one change, since both endpoints route through the orchestrator, which routes through this resolver.
- Fixes the batch cross-contamination bug (wrong locale's fonts applied to a cell) as a natural consequence of resolving per-locale instead of per-run.

**Negative / risk**

- Per-locale resolution is a behavior change from "resolve once per run," not a pure refactor — needs its own in-resolver cache to stay as cheap as today's once-per-run call.
- Fetch-failure fallback behavior needs an explicit decision as part of this work: whether to keep the current placeholder (a zero-byte font descriptor, which is not really "safe," just non-throwing) or change it to return an empty font set and let the renderer's own default font handling take over, logged but not faked. This changes rendering output on network failure and should not be inherited silently.

## Alternatives Considered

**Keep fonts and locale-merge as separate modules.** Rejected: they're both "per-locale render-input resolution," and the `lang` derivation bug specifically exists because the two concerns are handled in different files that don't share state — consolidating removes the seam where they drifted.

## Amendment (2026-10-25): fonts are cached by font set, and fall back to the script's built-in fonts

### Context

The poster starters gave locales their own font entries, and `default` for Latin locales, so different locales often resolve to the same fonts. A cache keyed by locale id downloaded the same set once per locale. The rule for which fonts a locale gets was also split across the resolver, the font loader and the CLI.

### Decision

- **One rule.** `packages/core/src/assets/locale-fonts.ts` decides a locale's fonts: `scriptOf` maps a locale id to its script, and `fontEntriesFor` picks the locale's own entry, else `default` (Latin only), else the script's built-in fonts. It replaces the classification rule above.
- **Cached by font set, not locale id.** This replaces "memoized **per locale id**" above. The cache lives in `font-config.ts`, keyed by `fontSetKey` (the entries in order, plus the config directory local paths resolve against). Locales that share fonts download once. Failures are not cached, so the next render retries.
- **A custom `fetchFonts` is not cached by the resolver.** One passed to `resolveAssetsForLocale` or the orchestrator is called for every render; the caller owns its caching. Fetchers made by `createFetchFontsFromConfig` and the built-in fetcher go through the cache.
- **Fetch failure falls back to the script's built-in fonts.** This settles the open question above. When the fetcher returns `null` (its fonts failed to load, or a custom fetcher has none), the resolver uses the built-in fonts for the locale's script: Noto Sans Arabic for Arabic, none for Latin, which leaves the renderer's default font. Nothing is faked with a zero-byte descriptor.

### Consequences

- A batch over `en`, `fr` and `de` sharing `default` fonts downloads them once.
- An Arabic render whose configured fonts fail still shapes Arabic text, in Noto rather than the configured face. When the fonts come from the config or the built-in set, the failure is logged at debug level; a custom fetcher that returns `null` is not logged by core.
