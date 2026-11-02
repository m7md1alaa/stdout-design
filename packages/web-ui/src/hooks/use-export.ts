import { useCallback, useState } from "react";

import { toastManager } from "@/components/ui/toast";

import type { TranslationPaths } from "../lib/locale-layer";
import { logWarn } from "../lib/logger";
import { buildShareUrl } from "../lib/persistence";
import { buildRenderOptions } from "../lib/renderer";
import type { RenderAdapter, ValidationIssue } from "../lib/renderer";

interface UseExportArgs {
  effectiveTemplateId: string | null;
  effectivePresetId: string | null;
  presetIds: string[];
  propValues: Record<string, unknown>;
  effectiveLocale: string | null;
  /** The effective locale's own text; empty without a picked locale. */
  localeOverrides: TranslationPaths;
  /** Every locale's own text, for the share link. */
  templateOverrides: Record<string, TranslationPaths> | undefined;
  autoDetected: boolean;
  selectedLocale: string | null;
  renderAdapter: RenderAdapter;
  onRenderIssues: (issues: ValidationIssue[]) => void;
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Owns PNG export, copy-to-clipboard, export-all, and share-link copying. */
export const useExport = ({
  effectiveTemplateId,
  effectivePresetId,
  presetIds,
  propValues,
  effectiveLocale,
  localeOverrides,
  templateOverrides,
  autoDetected,
  selectedLocale,
  renderAdapter,
  onRenderIssues,
}: UseExportArgs) => {
  const [busy, setBusy] = useState(false);

  const renderPreset = useCallback(
    (presetId: string) => {
      if (!effectiveTemplateId) {
        return null;
      }
      return renderAdapter.render(
        effectiveTemplateId,
        propValues,
        buildRenderOptions({
          autoDetected,
          locale: effectiveLocale,
          localeOverrides,
          preset: presetId,
        })
      );
    },
    [
      autoDetected,
      effectiveLocale,
      effectiveTemplateId,
      localeOverrides,
      propValues,
      renderAdapter,
    ]
  );

  const reportFailure = useCallback(
    (title: string, result: { error: string; issues?: ValidationIssue[] }) => {
      toastManager.add({ description: result.error, title, type: "error" });
      if (result.issues) {
        onRenderIssues(result.issues);
      }
    },
    [onRenderIssues]
  );

  const handleExport = useCallback(async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }
    setBusy(true);
    const result = await renderPreset(effectivePresetId);
    setBusy(false);
    if (!result) {
      return;
    }
    if (!result.ok) {
      reportFailure("Export failed", result);
      return;
    }
    downloadBlob(
      result.blob,
      `${effectiveTemplateId}-${effectivePresetId}.png`
    );
  }, [effectivePresetId, effectiveTemplateId, renderPreset, reportFailure]);

  const handleCopyImage = useCallback(async () => {
    if (!(effectiveTemplateId && effectivePresetId)) {
      return;
    }
    setBusy(true);
    const result = await renderPreset(effectivePresetId);
    setBusy(false);
    if (!result) {
      return;
    }
    if (!result.ok) {
      reportFailure("Couldn't copy image", result);
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": result.blob }),
      ]);
      toastManager.add({ title: "Image copied to clipboard", type: "success" });
    } catch (copyError) {
      logWarn("Failed to copy image", { error: String(copyError) });
      toastManager.add({
        description:
          "Your browser blocked clipboard access. Export the PNG instead.",
        title: "Couldn't copy image",
        type: "error",
      });
    }
  }, [effectivePresetId, effectiveTemplateId, renderPreset, reportFailure]);

  const handleExportAll = useCallback(async () => {
    if (!effectiveTemplateId || presetIds.length === 0) {
      return;
    }
    setBusy(true);
    let exported = 0;
    for (const presetId of presetIds) {
      // Sequential on purpose: the server renders one at a time anyway, and
      // browsers throttle bursts of downloads.
      // oxlint-disable-next-line no-await-in-loop
      const result = await renderPreset(presetId);
      if (!result?.ok) {
        setBusy(false);
        if (result) {
          reportFailure(`Export failed for ${presetId}`, result);
        }
        return;
      }
      downloadBlob(result.blob, `${effectiveTemplateId}-${presetId}.png`);
      exported += 1;
    }
    setBusy(false);
    toastManager.add({
      title: `Exported ${exported} ${exported === 1 ? "preset" : "presets"}`,
      type: "success",
    });
  }, [effectiveTemplateId, presetIds, renderPreset, reportFailure]);

  const handleCopyShareLink = useCallback(async () => {
    if (!effectiveTemplateId) {
      return;
    }
    const url = buildShareUrl({
      localeId: selectedLocale,
      localeOverrides: templateOverrides,
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
  }, [
    effectivePresetId,
    effectiveTemplateId,
    propValues,
    selectedLocale,
    templateOverrides,
  ]);

  return {
    busy,
    handleCopyImage,
    handleCopyShareLink,
    handleExport,
    handleExportAll,
  };
};

export type ExportState = ReturnType<typeof useExport>;
