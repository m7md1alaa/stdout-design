import { useCallback, useEffect, useRef, useState } from "react";

import {
  consumeShareParam,
  loadPersistedState,
  savePersistedState,
} from "../lib/persistence";
import type { PersistedAppState } from "../lib/persistence";
import type { ValidationIssue } from "../lib/renderer";
import {
  computeDefaultProps,
  mergeWithDefaults,
  setNestedValue,
} from "../lib/template-props";
import { resolveLocale } from "../lib/utils";
import type { SSEReloadEvent } from "./use-sse";
import { useSSE } from "./use-sse";
import type { PresetData, TemplateSchema } from "./use-templates";

const PERSIST_DEBOUNCE_MS = 300;

// Read once, outside any hook, so `consumeShareParam`'s URL-stripping side
// effect can't run twice across the several pieces of state that need it.
const initialState: PersistedAppState = (() => {
  const persisted = loadPersistedState();
  const share = consumeShareParam();
  if (!share) {
    return persisted;
  }
  return {
    propStore: { ...persisted.propStore, [share.templateId]: share.props },
    selectedLocale: share.localeId,
    selectedPreset: share.presetId,
    selectedTemplate: share.templateId,
  };
})();

interface UseStudioStateArgs {
  templates: TemplateSchema[];
  presets: PresetData[];
  locales: string[];
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
  locales,
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
  const [reloadToken, setReloadToken] = useState(0);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const effectiveTemplateId = selectedTemplate ?? templates[0]?.id ?? null;
  const effectivePresetId =
    selectedPreset ?? defaultPreset ?? presets[0]?.id ?? null;

  const currentTemplate = templates.find((t) => t.id === effectiveTemplateId);
  const currentPreset = presets.find((p) => p.id === effectivePresetId) ?? null;

  const defaultPropsCache = useRef<Record<string, Record<string, unknown>>>({});
  const propValues = effectiveTemplateId
    ? mergeWithDefaults(
        (defaultPropsCache.current[effectiveTemplateId] ??= computeDefaultProps(
          currentTemplate?.propsSchema
        )),
        propStore[effectiveTemplateId]
      )
    : {};

  const { locale: effectiveLocale, autoDetected } = resolveLocale(
    selectedLocale,
    propValues,
    locales
  );

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

  // Autosave: debounced so typing doesn't hammer localStorage on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      savePersistedState({
        propStore,
        selectedLocale,
        selectedPreset,
        selectedTemplate,
      });
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [propStore, selectedLocale, selectedPreset, selectedTemplate]);

  const handleTemplateChange = useCallback((id: string) => {
    setSelectedTemplate(id);
    setValidationErrors({});
  }, []);

  const handlePropChange = useCallback(
    (path: string, value: unknown) => {
      if (!effectiveTemplateId) {
        return;
      }
      setPropStore((prev) => ({
        ...prev,
        [effectiveTemplateId]: setNestedValue(
          prev[effectiveTemplateId] ?? {},
          path,
          value
        ),
      }));
      setValidationErrors((prev) => {
        const { [path]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [effectiveTemplateId]
  );

  const handleResetProps = useCallback(() => {
    if (!effectiveTemplateId) {
      return;
    }
    setPropStore((prev) => {
      const { [effectiveTemplateId]: _removed, ...rest } = prev;
      return rest;
    });
    setValidationErrors({});
  }, [effectiveTemplateId]);

  const handleRenderIssues = useCallback((issues: ValidationIssue[]) => {
    const errorMap: Record<string, string> = {};
    for (const issue of issues) {
      errorMap[issue.path] = issue.message;
    }
    setValidationErrors(errorMap);
  }, []);

  return {
    autoDetected,
    currentPreset,
    currentTemplate,
    effectiveLocale,
    effectivePresetId,
    effectiveTemplateId,
    handleLocaleChange: setSelectedLocale,
    handlePropChange,
    handleRenderIssues,
    handleResetProps,
    handleTemplateChange,
    propStore,
    propValues,
    reloadToken,
    selectedLocale,
    setSelectedPreset,
    validationErrors,
  };
};

export type StudioState = ReturnType<typeof useStudioState>;
