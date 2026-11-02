import { useCallback, useEffect, useMemo, useState } from "react";

import { isModified } from "../lib/field-state";
import { applyListOp } from "../lib/list-ops";
import type { ListOp } from "../lib/list-ops";
import {
  applyTranslationPaths,
  isTranslatablePath,
  remapListPaths,
} from "../lib/locale-layer";
import type { TranslationPaths } from "../lib/locale-layer";
import {
  consumeShareParam,
  loadPersistedState,
  savePersistedState,
} from "../lib/persistence";
import type {
  LocaleOverrideStore,
  PersistedAppState,
} from "../lib/persistence";
import type { ValidationIssue } from "../lib/renderer";
import {
  computeDefaultProps,
  getNestedValue,
  mergeWithDefaults,
  setNestedValue,
} from "../lib/template-props";
import { resolveLocale } from "../lib/utils";
import type { LocaleSummary } from "../lib/utils";
import { useLocaleStrings } from "./use-locale-strings";
import type { SSEReloadEvent } from "./use-sse";
import { useSSE } from "./use-sse";
import type { PresetData, TemplateSchema } from "./use-templates";

const PERSIST_DEBOUNCE_MS = 300;

const NO_OVERRIDES: TranslationPaths = {};

const withoutKey = <T>(record: Record<string, T>, key: string) =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

/** Drops the overrides at `path` and, for a list or object, everything inside it. */
const withoutPathsUnder = (
  paths: TranslationPaths,
  path: string
): TranslationPaths =>
  Object.fromEntries(
    Object.entries(paths).filter(
      ([key]) => key !== path && !key.startsWith(`${path}.`)
    )
  );

const hasPathsUnder = (paths: TranslationPaths, path: string): boolean =>
  Object.keys(paths).some((key) => key === path || key.startsWith(`${path}.`));

// Read once, outside any hook, so `consumeShareParam`'s URL-stripping side
// effect can't run twice across the several pieces of state that need it.
const initialState: PersistedAppState = (() => {
  const persisted = loadPersistedState();
  const share = consumeShareParam();
  if (!share) {
    return persisted;
  }
  return {
    localeOverrides: share.localeOverrides
      ? {
          ...persisted.localeOverrides,
          [share.templateId]: share.localeOverrides,
        }
      : persisted.localeOverrides,
    propStore: { ...persisted.propStore, [share.templateId]: share.props },
    selectedLocale: share.localeId,
    selectedPreset: share.presetId,
    selectedTemplate: share.templateId,
  };
})();

interface UseStudioStateArgs {
  templates: TemplateSchema[];
  presets: PresetData[];
  localeInfo: LocaleSummary[];
  defaultPreset: string | null;
  reload: () => void;
}

/**
 * Owns the studio's editable state: which template/preset/locale is
 * selected, each template's prop values, persistence (load/autosave/share
 * links), and SSE-driven reloads. Everything downstream (export, the
 * canvas, the props panel) reads its output rather than touching
 * localStorage/SSE/schema-default logic directly.
 */
export const useStudioState = ({
  templates,
  presets,
  localeInfo,
  defaultPreset,
  reload,
}: UseStudioStateArgs) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    initialState.selectedTemplate
  );
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    initialState.selectedPreset
  );
  const [selectedLocale, setSelectedLocale] = useState<string | null>(
    initialState.selectedLocale
  );
  const [propStore, setPropStore] = useState<
    Record<string, Record<string, unknown>>
  >(initialState.propStore);
  const [localeOverrides, setLocaleOverrides] = useState<LocaleOverrideStore>(
    initialState.localeOverrides
  );
  const [reloadToken, setReloadToken] = useState(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Saved or shared ids can name a template or preset this project no longer
  // has; fall back instead of leaving the canvas with nothing to show.
  const knownTemplate = templates.some((t) => t.id === selectedTemplate);
  const knownPreset = presets.some((p) => p.id === selectedPreset);
  const effectiveTemplateId =
    (knownTemplate ? selectedTemplate : null) ?? templates[0]?.id ?? null;
  const effectivePresetId =
    (knownPreset ? selectedPreset : null) ??
    defaultPreset ??
    presets[0]?.id ??
    null;

  const currentTemplate = templates.find((t) => t.id === effectiveTemplateId);
  const currentPreset = presets.find((p) => p.id === effectivePresetId) ?? null;

  const effectiveTemplateSchema = currentTemplate?.propsSchema;
  const effectivePropStore = effectiveTemplateId
    ? propStore[effectiveTemplateId]
    : undefined;

  const defaultProps = useMemo(
    () => computeDefaultProps(effectiveTemplateSchema),
    [effectiveTemplateSchema]
  );
  const propValues = useMemo(() => {
    if (!effectiveTemplateId) {
      return {};
    }
    return mergeWithDefaults(defaultProps, effectivePropStore);
  }, [defaultProps, effectiveTemplateId, effectivePropStore]);

  const { locale: effectiveLocale, autoDetected } = resolveLocale(
    selectedLocale,
    propValues,
    localeInfo
  );

  // Locale layers apply to a locale the user picked, not one guessed from
  // the text (ADR-0021); the server makes the same call.
  const layerLocale = effectiveLocale && !autoDetected ? effectiveLocale : null;
  const templateOverrides = effectiveTemplateId
    ? localeOverrides[effectiveTemplateId]
    : undefined;
  const overridesFor = useCallback(
    (locale: string | null): TranslationPaths =>
      (locale ? templateOverrides?.[locale] : undefined) ?? NO_OVERRIDES,
    [templateOverrides]
  );
  const currentOverrides = overridesFor(layerLocale);

  useSSE(
    useCallback(
      (event: SSEReloadEvent) => {
        if (event.type === "full") {
          reload();
          setReloadToken((t) => t + 1);
        }
        if (
          event.type === "template" &&
          event.templateId === effectiveTemplateId
        ) {
          setReloadToken((t) => t + 1);
        }
      },
      [reload, effectiveTemplateId]
    )
  );

  const localeStrings = useLocaleStrings(
    effectiveTemplateId,
    layerLocale,
    reloadToken
  );
  const schema = effectiveTemplateSchema;

  // What the inspector shows: the base values with this locale's file
  // strings and then its overrides laid over the translatable text.
  const displayValues = useMemo(() => {
    if (!(layerLocale && schema)) {
      return propValues;
    }
    return applyTranslationPaths(schema, propValues, {
      ...localeStrings,
      ...currentOverrides,
    });
  }, [currentOverrides, layerLocale, localeStrings, propValues, schema]);

  const isLocalized = useCallback(
    (path: string): boolean =>
      Boolean(layerLocale && schema && isTranslatablePath(schema, path)),
    [layerLocale, schema]
  );

  // Autosave: debounced so typing doesn't hammer localStorage on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      savePersistedState({
        localeOverrides,
        propStore,
        selectedLocale,
        selectedPreset,
        selectedTemplate,
      });
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    localeOverrides,
    propStore,
    selectedLocale,
    selectedPreset,
    selectedTemplate,
  ]);

  const handleTemplateChange = useCallback((id: string) => {
    setSelectedTemplate(id);
    setValidationErrors({});
  }, []);

  const clearErrorAt = useCallback((path: string) => {
    setValidationErrors((prev) =>
      path in prev ? withoutKey(prev, path) : prev
    );
  }, []);

  const setBaseValue = useCallback(
    (path: string, value: unknown) => {
      if (!effectiveTemplateId) {
        return;
      }
      setPropStore((prev) => {
        const stored = prev[effectiveTemplateId] ?? {};
        const [head = path] = path.split(".");
        // The store keeps only edited keys. A path into a list or object
        // (`stats.1.label`) needs that key's current value to land in.
        const seeded =
          head !== path && stored[head] === undefined
            ? { ...stored, [head]: propValues[head] }
            : stored;
        return {
          ...prev,
          [effectiveTemplateId]: setNestedValue(seeded, path, value),
        };
      });
    },
    [effectiveTemplateId, propValues]
  );

  /** Applies `update` to this template's overrides for `locale`. */
  const updateOverrides = useCallback(
    (locale: string, update: (paths: TranslationPaths) => TranslationPaths) => {
      if (!effectiveTemplateId) {
        return;
      }
      setLocaleOverrides((prev) => {
        const byLocale = prev[effectiveTemplateId] ?? {};
        return {
          ...prev,
          [effectiveTemplateId]: {
            ...byLocale,
            [locale]: update(byLocale[locale] ?? NO_OVERRIDES),
          },
        };
      });
    },
    [effectiveTemplateId]
  );

  /**
   * One edit from the inspector. With a locale picked, translatable text
   * becomes that locale's override and every other value stays shared.
   */
  const handlePropChange = useCallback(
    (path: string, value: unknown) => {
      if (layerLocale && typeof value === "string" && isLocalized(path)) {
        updateOverrides(layerLocale, (paths) => ({ ...paths, [path]: value }));
      } else {
        setBaseValue(path, value);
      }
      clearErrorAt(path);
    },
    [clearErrorAt, isLocalized, layerLocale, setBaseValue, updateOverrides]
  );

  /**
   * Adds, removes or reorders list items in the base values, and moves
   * every locale's overrides along with their items.
   */
  const handleListOp = useCallback(
    (path: string, op: ListOp) => {
      if (!effectiveTemplateId) {
        return;
      }
      const current = getNestedValue(propValues, path);
      setBaseValue(
        path,
        applyListOp(Array.isArray(current) ? current : [], op)
      );
      setLocaleOverrides((prev) => {
        const byLocale = prev[effectiveTemplateId];
        if (!byLocale) {
          return prev;
        }
        return {
          ...prev,
          [effectiveTemplateId]: Object.fromEntries(
            Object.entries(byLocale).map(([locale, paths]) => [
              locale,
              remapListPaths(paths, path, op),
            ])
          ),
        };
      });
      setValidationErrors({});
    },
    [effectiveTemplateId, propValues, setBaseValue]
  );

  /**
   * Whether a field shows something other than its untouched value: for a
   * per-locale field, an override; otherwise a base value off its default.
   * In a locale, a list also counts as changed when an item has an override.
   */
  const isFieldModified = useCallback(
    (path: string): boolean => {
      if (isLocalized(path)) {
        return path in currentOverrides;
      }
      const baseModified = isModified(
        getNestedValue(propValues, path),
        getNestedValue(defaultProps, path)
      );
      return baseModified || hasPathsUnder(currentOverrides, path);
    },
    [currentOverrides, defaultProps, isLocalized, propValues]
  );

  /** Undoes what `isFieldModified` reports. */
  const handleResetField = useCallback(
    (path: string) => {
      if (layerLocale && hasPathsUnder(currentOverrides, path)) {
        updateOverrides(layerLocale, (paths) => withoutPathsUnder(paths, path));
      }
      if (!isLocalized(path)) {
        setBaseValue(path, getNestedValue(defaultProps, path));
      }
      clearErrorAt(path);
    },
    [
      clearErrorAt,
      currentOverrides,
      defaultProps,
      isLocalized,
      layerLocale,
      setBaseValue,
      updateOverrides,
    ]
  );

  /** Back to the template's defaults: base values and every locale's overrides. */
  const handleResetProps = useCallback(() => {
    if (!effectiveTemplateId) {
      return;
    }
    setPropStore((prev) => withoutKey(prev, effectiveTemplateId));
    setLocaleOverrides((prev) => withoutKey(prev, effectiveTemplateId));
    setValidationErrors({});
  }, [effectiveTemplateId]);

  const hasEdits = Boolean(
    effectiveTemplateId &&
    (propStore[effectiveTemplateId] ||
      Object.values(templateOverrides ?? {}).some(
        (paths) => Object.keys(paths).length > 0
      ))
  );

  const handleRenderIssues = useCallback((issues: ValidationIssue[]) => {
    if (issues.length === 0) {
      setValidationErrors((prev) =>
        Object.keys(prev).length === 0 ? prev : {}
      );
      return;
    }
    const errorMap: Record<string, string> = {};
    for (const issue of issues) {
      errorMap[issue.path] = issue.message;
    }
    setValidationErrors(errorMap);
  }, []);

  return {
    autoDetected,
    currentOverrides,
    currentPreset,
    currentTemplate,
    displayValues,
    effectiveLocale,
    effectivePresetId,
    effectiveTemplateId,
    handleListOp,
    handleLocaleChange: setSelectedLocale,
    handlePropChange,
    handleRenderIssues,
    handleResetField,
    handleResetProps,
    handleTemplateChange,
    hasEdits,
    isFieldModified,
    isLocalized,
    layerLocale,
    overridesFor,
    propStore,
    propValues,
    reloadToken,
    selectedLocale,
    setSelectedPreset,
    templateOverrides,
    validationErrors,
  };
};

export type StudioState = ReturnType<typeof useStudioState>;
