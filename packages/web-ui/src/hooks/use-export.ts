import { useCallback } from "react";

import { toastManager } from "@/components/ui/toast";

import { logWarn } from "../lib/logger";
import { buildShareUrl } from "../lib/persistence";
import { buildRenderOptions } from "../lib/renderer";
import type { RenderAdapter, ValidationIssue } from "../lib/renderer";

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
  const handleExport = useCallback(async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }

    const result = await renderAdapter.render(
      effectiveTemplateId,
      propValues,
      buildRenderOptions({
        autoDetected,
        locale: effectiveLocale,
        preset: effectivePresetId,
      })
    );

    if (!result.ok) {
      toastManager.add({
        description: result.error,
        title: "Export failed",
        type: "error",
      });
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
      toastManager.add({ title: "Link copied to clipboard", type: "success" });
    } catch (copyError) {
      logWarn("Failed to copy share link", { error: String(copyError) });
      toastManager.add({
        description: "Copy it from the address bar instead.",
        title: "Couldn't copy link",
        type: "error",
      });
    }
  }, [effectivePresetId, effectiveTemplateId, propValues, selectedLocale]);

  return {
    handleCopyShareLink,
    handleExport,
  };
};

export type ExportState = ReturnType<typeof useExport>;
