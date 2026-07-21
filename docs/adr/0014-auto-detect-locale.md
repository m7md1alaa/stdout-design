# 0014. Auto-detect locale from content — remove `locale` from template props schemas

## Status

Proposed

## Context

Every template in `examples/templates/` today defines a `locale` prop in its
`propsSchema`:

```typescript
locale: z.string().optional().describe("Current locale code for RTL support"),
```

And then re-implements the same locale-detection logic inline:

```typescript
const isRtl = locale?.startsWith("ar") ?? false;
lang={isRtl ? "ar" : undefined}
dir={isRtl ? "rtl" : "ltr"}
style={{ fontFamily: isRtl ? "'Noto Sans Arabic arabic'..." : "sans-serif" }}
```

Three things are wrong with this:

1. **`locale` is not user-editable template data.** It's rendering metadata
   injected by the pipeline. A template author shouldn't be told "add this
   boilerplate field so fonts work." Fonts and layout direction are the
   framework's responsibility, the same way CSS and HTML semantics are.

2. **The `fontFamily` and `lang` overrides are unnecessary.** The orchestrator
   already resolves Arabic fonts per-locale and passes them (along with `lang`)
   to the renderer via `renderToPixels`. The template's manual `fontFamily`
   hack is bypassing the framework's own font resolution and will break if
   font resolution is ever extended to other scripts (e.g. CJK).

3. **The `lang` / `dir` split creates silent divergence.** Templates that
   forget to add the `locale` prop render Arabic text without RTL support.
   Templates that add it incorrectly render English text with RTL layout.
   Either way, the "correct" behavior depends on the author remembering to
   wire up 6 lines of ceremony per template — and the webUI doesn't even
   provide a way to populate this field today.

The root cause: locale is content-derived, not user-specified. The locale
code should be inferred from what's on the card, not chosen by the operator.

## Decision

1. **The webUI auto-detects Arabic script in prop values** and passes `locale`
   in the render request automatically. No locale selector interaction is
   required for fonts to load correctly. A locale selector *does* remain
   available for explicit translation mode (where locale data from
   `locales/ar.json` should be merged). The auto-detection is a fallback, not
   a replacement.

2. **`locale` is removed from template `propsSchema` definitions.**
   `expandMatrix` still injects `locale: localeId` into `cell.props` at
   runtime (same as today), so templates can still read `locale` from props if
   they genuinely need it for direction switching — but they no longer
   *declare* it as a user-editable field. The Zod schema describes
   user-provided content, not framework internals.

3. **`lang` is set on the compiled template root node by `prepPipeline`.**
   When the orchestrator classifies a locale as Arabic, `lang="ar"` is baked
   into the element before compilation. Templates stop doing their own
   `lang={...}` checks.

4. **`dir="rtl"` and `fontFamily` overrides are removed from example
   templates.** The renderer receives `lang` and fonts from the orchestrator;
   layout direction and font selection are the renderer's responsibility.
   Templates that need explicit RTL layout for visual reasons (e.g. a
   mirror-image design) can still add `dir="rtl"` themselves, but it's an
   intentional design choice, not a locale-workaround.

## Consequences

**Positive**

- Templates drop 6–10 lines of ceremony. A new template author types
  `z.object({ title: z.string() })` and gets Arabic rendering for free.
- The `fontFamily` hack disappears — templates no longer hardcode
  `'Noto Sans Arabic arabic'` into their JSX, so font resolution can evolve
  (e.g. add CJK support, swap the Arabic font family) without touching any
  template.
- The webUI renders Arabic text correctly on every keystroke, even before the
  developer thinks to configure locale support. This closes the gap between
  "I typed Arabic in the text field" and "I see Arabic on the preview."

**Negative / risk**

- Deferred: moving `lang` setting into `prepPipeline` and stripping
  `fontFamily` overrides from templates assumes the renderer does the right
  thing with those inputs. This should be verified with a full-pipeline test
  (ADR-0013) before landing.
- Auto-detection in the webUI re-renders when Arabic text appears in any
  prop, which may cause an extra render pass the first time Arabic is typed.
  This is negligible (200ms debounce already exists) but worth noting.

## Alternatives Considered

**Keep `locale` as a user-configurable field and add a locale dropdown to the
webUI, but don't auto-detect.** Rejected: shifts the burden to every operator
who types Arabic text. "Why doesn't my Arabic text render correctly?" becomes
"Did you remember to select 'ar' from the locale bar?" — poor UX for something
the framework can determine automatically.

**Auto-detect at the orchestrator level instead of the webUI.** Rejected:
the orchestrator operates on compiled templates and resolved props. By the
time `orchestrateRender` runs, the locale should already be known so that
`loadLocaleData` has a locale to load. The webUI is the right layer for
content-based detection because it has access to the raw prop values before
they're sent.

**Keep `locale` in `propsSchema` but make it invisible/hidden in the UI.**
Rejected: the schema should describe the template's data contract, not the
framework's internal wiring. A prop that the user never sees and never edits
shouldn't be in the schema at all.
