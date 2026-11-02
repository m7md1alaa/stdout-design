# 0019. One template interface with a render context, and module boundaries enforced by a test

## Status

Accepted. Amends ADR-0008 (the layer order is now checked, not described) and ADR-0014 (templates read direction from the render context, not a `locale` prop).

## Context

A review of the four poster starters (`launch-hero`, `bento-feature`, `retro-poster`, `trend-poster`) found sixteen problems that come from a handful of weak spots, not from careless code:

- **One rule, decided in many places.** `locale?.startsWith("ar")` appears in every template, in `assets/font-config.ts`, `assets/assets-resolver.ts`, `web-ui/src/lib/utils.ts`, and the i18n docs. Each template then hand-writes about twenty physical-side ternaries (`isRtl ? "right" : "left"`) and fifteen Arabic typography ternaries (no tracking, no italics, taller leading). Persian, Hebrew, and Urdu are wrong everywhere.
- **Render facts travel in the props bag, and two paths fill it differently.** `batch/matrix.ts` injects `locale` into props; dev-server's `/render` passes it beside them. So the studio preview loads Arabic copy but lays it out left-to-right, and every starter re-declares `locale` in its schema, which ADR-0014 already rejected. Templates never learn the canvas size.
- **Facts never recorded, so code guesses them.** The studio decides a field is a color by finding "color" in its name (`web-ui/src/lib/resolve-field-kind.ts`), so `highlight`, `paper`, and `background` get text boxes. Item counts live in `.describe()` prose. A template's font needs live in strings that must match `scaffold.ts`'s font list by hand.
- **Translation merge sees values, not the schema.** `mergeLocaleProps` only overrides whole strings and arrays, so starters pack structure into strings (`"Coffee 4.50"`, "the last word is the amount").
- **Boundaries live only in ADR prose.** ADR-0008 says `shared/` is I/O-free and layers import in one direction, but nothing checks it: `shared/` imported `assets/`, and `orchestrate/` and `batch/` imported each other. Ultracite's `import/no-cycle` sees files, not folders, so it passed.

## Decision

1. **`defineTemplate({ schema, fonts, render: (props, ctx) => … })` is the template interface**, exported from a new `@stdout-design/core/template` subpath and re-exported as `@stdout-design/cli/template`. The schema describes user content only; a type rejects the reserved keys `locale` and `ctx`.
2. **The render context `ctx` is built once, in `orchestrateRender`** (the single entry point from ADR-0009), so batch and the live preview cannot disagree. It carries `locale`, `dir`, `canvas`, `flip()`, `type()` (per-script typography), and typed `fonts`. Core sets `dir` and `lang` on the root, so logical CSS properties (`insetInlineStart`, `marginInlineEnd`) mirror on their own; `flip()` covers what CSS does not (rotation, SVG offsets). Both cache keys hash the locale, canvas, and loaded fonts with the props.
3. **`classifyLocale` in `shared/locale.ts` (pure, so every layer may use it) is the only place that maps a locale to script and direction**, through closed lookup tables (`Record<Script, Direction>`) the compiler checks for completeness. dev-server's `/config` sends each locale's `dir` so web-ui stops testing for `"ar"`.
4. **Schema fields record their kind** (`field.color()`, `field.text()`, `field.list()`, `field.object()`) and whether they are translatable, via zod metadata that reaches web-ui through the JSON schema. The studio reads the kind; `applyTranslations` walks the schema and replaces only translatable text, at any depth, without changing list lengths. Translated props are validated again.
5. **Templates declare their fonts**; the pipeline loads the declared families on every locale, and `studio.config.ts` fonts become overrides: a family the config loads is the config's to define (a local file wins over Google). A non-Latin locale with no config entry also gets its script's Noto face, unless the template names that face.
6. **Module boundaries are data plus a test.** `packages/config/boundaries/rules.ts` holds the core layer graph (with `types`-only edges, e.g. `assets → engine`), the I/O-free layers, the workspace dependency graph, the template import allowlist, and a list of deliberate exceptions, each with a reason. `boundaries.test.ts` walks every source file with a real parser and fails on any edge the tables don't allow, on a core folder or workspace missing from the tables, and on an exception nothing uses anymore. It also fails on any line matching `FORBIDDEN_PATTERNS`, code that re-decides a rule owned elsewhere (a `startsWith("ar")` locale test). It runs in `turbo test`, so CI enforces it.
7. **Legacy templates keep working until 1.0.** A template not built with `defineTemplate` still receives `props.locale`, now on both paths, with a one-time deprecation warning.

## Consequences

**Positive**

- A new import edge between layers or packages is a one-line, reviewed change to `rules.ts`, not a judgment call; the test names the file, the import, and the rule it breaks.
- Templates lose the `locale` field, the direction and typography ternaries, and the string parsers; a new script is one table row.
- The studio preview and CLI batch render the same layout for the same locale.

**Negative / risk**

- Templates written with `defineTemplate` are no longer plain React components; they need the pipeline (or a test helper) to supply `ctx`.
- The per-script typography table is opinionated. A face it doesn't suit takes exact per-script values: `ctx.type({ …, scripts: { arabic: { size: 100, leading: 1 } } })`.
- The boundary test reads static imports and literal dynamic imports. A computed `import(path)` is invisible to it; `batch/loaders.ts` uses one deliberately, to load user templates.
- Every render loads every face its template declares, so a Latin render of a bilingual template also downloads its Arabic faces (once per process, cached by family set).

## Rollout

Seven slices, each landing alone: (1) boundary rules and test, fixing the two live violations; (2) `classifyLocale`; (3) `defineTemplate`, `ctx`, `field.*`; (4) schema-driven merge and field kinds in web-ui; (5) template-declared fonts; (6) port the four starters and the docs, plus a render test over every starter × locale × preset; (7) a small authoring kit (`keyed`, `words`, a self-mirroring `Arrow`, `Sparkle`, `halftone`, `starburst`). Slice 7 landed before slice 6, so the ported starters use the kit. The starters from PR #7 may merge before slice 6, but no CLI release ships them until slice 6 lands.

## Alternatives Considered

**A React-context hook (`useRender()`) instead of a second `render` argument.** Rejected: Takumi compiles the element tree in its own pass, and a context provider is one more thing that can silently be missing; a function argument cannot be.

**A reserved `ctx` prop.** Rejected: it puts render facts back into the user-content bag, the same mix that caused the batch/preview split.

**dependency-cruiser or oxlint `no-restricted-imports` overrides for boundaries.** Rejected for now: one more tool and config dialect, no `types`-only edges, and no check that every folder and workspace is declared. The test keeps the rules in TypeScript, typed against closed sets.
