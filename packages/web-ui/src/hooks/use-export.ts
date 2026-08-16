import { useCallback, useState } from "react";

import { logWarn } from "../lib/logger";
import { buildShareUrl } from "../lib/persistence";
import type { RenderAdapter, ValidationIssue } from "../lib/renderer";

const COPY_FEEDBACK_MS = 2500;

interface UseExportArgs {
  effectiveTemplateId: string | null;
  effectivePresetId: string | null;
  propValues: Record<string, unknown>;
  effectiveLocale: string | null;
  autoDetected: boolean;
  selectedLocale: string | null;
  renderAdapter: RenderAdapter;
  onRenderIssues: (issues: ValidationIssue[]) => void;
}

/** Owns PNG export and shareable-link copying, plus their transient UI feedback. */
export const useExport = ({
  effectiveTemplateId,
  effectivePresetId,
  propValues,
  effectiveLocale,
  autoDetected,
  selectedLocale,
  renderAdapter,
  onRenderIssues,
}: UseExportArgs) => {
  const [exportError, setExportError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }

    setExportError(null);

    const result = await renderAdapter.render(effectiveTemplateId, propValues, {
      autoDetected,
      locale: effectiveLocale ?? undefined,
      preset: effectivePresetId,
    });

    if (!result.ok) {
      setExportError(result.error);
      if (result.issues) {
        onRenderIssues(result.issues);
      }
      return;
    }

    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveTemplateId}-${effectivePresetId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    autoDetected,
    effectiveLocale,
    effectivePresetId,
    effectiveTemplateId,
    onRenderIssues,
    propValues,
    renderAdapter,
  ]);

  const handleCopyShareLink = useCallback(async () => {
    if (!effectiveTemplateId) {
      return;
    }
    const url = buildShareUrl({
      localeId: selectedLocale,
      presetId: effectivePresetId,
      props: propValues,
      templateId: effectiveTemplateId,
    });
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Link copied to clipboard");
    } catch (copyError) {
      logWarn("Failed to copy share link", { error: String(copyError) });
      setCopyFeedback("Couldn't copy — copy it from the address bar instead");
    }
    setTimeout(() => setCopyFeedback(null), COPY_FEEDBACK_MS);
  }, [effectivePresetId, effectiveTemplateId, propValues, selectedLocale]);

  const handleDismissExportError = useCallback(() => setExportError(null), []);

  return {
    copyFeedback,
    exportError,
    handleCopyShareLink,
    handleDismissExportError,
    handleExport,
  };
};

export type ExportState = ReturnType<typeof useExport>;
