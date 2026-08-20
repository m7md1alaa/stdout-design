import { useEffect, useRef, useState } from "react";

import { buildRenderOptions } from "../lib/renderer";
import type { RenderAdapter, ValidationIssue } from "../lib/renderer";

const DEBOUNCE_MS = 200;

export interface RenderPreviewInput {
  templateId: string | null;
  props: Record<string, unknown>;
  preset: {
    id: string;
    width: number;
    height: number;
    platform: string;
  } | null;
  locale: string | null;
  autoDetected: boolean;
  reloadToken: number;
}

export interface RenderPreviewState {
  url: string;
  status: "loading" | "loaded" | "error";
  issues?: ValidationIssue[];
  message?: string;
}

/**
 * Pure — derives the skip/debounce key from everything a preview render
 * depends on. Exported so the derivation (e.g. whether it's sensitive to
 * key ordering inside `props`) is testable without mounting a component.
 */
export const computePreviewKey = (input: RenderPreviewInput): string =>
  `${input.templateId}-${JSON.stringify(input.props)}-${input.preset?.id ?? "none"}-${input.locale ?? "none"}-${input.autoDetected}-${input.reloadToken}`;

/**
 * Owns the live preview render as one seam: debounces input changes, skips
 * re-firing an identical render, aborts an in-flight request when inputs
 * change again, and manages the resulting blob URL's lifecycle (revoking
 * the previous one before replacing it, and on unmount).
 */
export const useRenderPreview = (
  input: RenderPreviewInput,
  renderAdapter: RenderAdapter,
  onRenderIssues: (issues: ValidationIssue[]) => void
): RenderPreviewState | null => {
  const [render, setRender] = useState<RenderPreviewState | null>(null);
  const lastKeyRef = useRef("");
  const currentUrlRef = useRef<string | null>(null);
  const onRenderIssuesRef = useRef(onRenderIssues);

  useEffect(() => {
    onRenderIssuesRef.current = onRenderIssues;
  }, [onRenderIssues]);

  const { templateId, props, preset, locale, autoDetected, reloadToken } =
    input;

  useEffect(() => {
    if (!(templateId && preset)) {
      return;
    }

    const controller = new AbortController();
    const key = computePreviewKey({
      autoDetected,
      locale,
      preset,
      props,
      reloadToken,
      templateId,
    });

    if (key === lastKeyRef.current) {
      return;
    }

    const timer = setTimeout(async () => {
      lastKeyRef.current = key;
      setRender({ status: "loading", url: "" });
      onRenderIssuesRef.current([]);

      const result = await renderAdapter.render(
        templateId,
        props,
        buildRenderOptions({
          autoDetected,
          locale,
          preset: preset.id,
          signal: controller.signal,
        })
      );

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setRender({
          issues: result.issues,
          message: result.error,
          status: "error",
          url: "",
        });
        if (result.issues) {
          onRenderIssuesRef.current(result.issues);
        }
        return;
      }

      const url = URL.createObjectURL(result.blob);

      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
      currentUrlRef.current = url;

      setRender({ status: "loaded", url });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    templateId,
    props,
    preset,
    locale,
    autoDetected,
    reloadToken,
    renderAdapter,
  ]);

  useEffect(
    () => () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = null;
      }
    },
    []
  );

  return render;
};
