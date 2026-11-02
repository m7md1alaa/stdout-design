import { useEffect, useRef, useState } from "react";

import type { TranslationPaths } from "../lib/locale-layer";
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
  /** `locale`'s own text by prop path; empty without a picked locale. */
  localeOverrides: TranslationPaths;
  autoDetected: boolean;
  reloadToken: number;
}

export interface RenderPreviewState {
  /**
   * The newest good frame for the current template and preset. It stays set
   * while the next render is `loading` or has failed, so the canvas can keep
   * showing the artwork instead of blanking on every edit. Empty only when
   * no frame has rendered yet for this template and preset.
   */
  url: string;
  status: "loading" | "loaded" | "error";
  issues?: ValidationIssue[];
  message?: string;
}

interface Frame {
  url: string;
  templateId: string;
  presetId: string;
}

/**
 * Pure — derives the skip/debounce key from everything a preview render
 * depends on. Exported so the derivation (e.g. whether it's sensitive to
 * key ordering inside `props`) is testable without mounting a component.
 */
export const computePreviewKey = (input: RenderPreviewInput): string =>
  `${input.templateId}-${JSON.stringify(input.props)}-${input.preset?.id ?? "none"}-${input.locale ?? "none"}-${JSON.stringify(input.localeOverrides)}-${input.autoDetected}-${input.reloadToken}`;

/**
 * Owns the live preview render as one seam: debounces input changes, skips
 * re-firing an identical render, aborts an in-flight request when inputs
 * change again, and manages the resulting blob URL's lifecycle (revoking
 * the previous one before replacing it, and on unmount). The last good
 * frame is kept while a new render is in flight or has failed, as long as
 * it was rendered for the same template and preset.
 */
export const useRenderPreview = (
  input: RenderPreviewInput,
  renderAdapter: RenderAdapter,
  onRenderIssues: (issues: ValidationIssue[]) => void
): RenderPreviewState | null => {
  const [render, setRender] = useState<RenderPreviewState | null>(null);
  const lastKeyRef = useRef("");
  const frameRef = useRef<Frame | null>(null);
  // The state of the last render that finished, and the state on screen.
  const settledRef = useRef<RenderPreviewState | null>(null);
  const shownRef = useRef<RenderPreviewState | null>(null);
  const onRenderIssuesRef = useRef(onRenderIssues);

  useEffect(() => {
    onRenderIssuesRef.current = onRenderIssues;
  }, [onRenderIssues]);

  const {
    templateId,
    props,
    preset,
    locale,
    localeOverrides,
    autoDetected,
    reloadToken,
  } = input;

  useEffect(() => {
    if (!(templateId && preset)) {
      return;
    }

    const controller = new AbortController();
    const key = computePreviewKey({
      autoDetected,
      locale,
      localeOverrides,
      preset,
      props,
      reloadToken,
      templateId,
    });

    const show = (next: RenderPreviewState) => {
      shownRef.current = next;
      setRender(next);
    };

    if (key === lastKeyRef.current) {
      // An edit was undone while a different render was in flight. Aborting
      // that render leaves the state on "loading", so put back the finished
      // render this key already has.
      const settled = settledRef.current;
      if (settled && shownRef.current !== settled) {
        show(settled);
        onRenderIssuesRef.current(settled.issues ?? []);
      }
      return;
    }

    // A frame from another template or preset has the wrong content or
    // aspect ratio, so only the same pair's last frame may stand in.
    const keptUrl = () => {
      const frame = frameRef.current;
      return frame?.templateId === templateId && frame.presetId === preset.id
        ? frame.url
        : "";
    };

    const timer = setTimeout(async () => {
      show({ status: "loading", url: keptUrl() });
      onRenderIssuesRef.current([]);

      const result = await renderAdapter.render(
        templateId,
        props,
        buildRenderOptions({
          autoDetected,
          locale,
          localeOverrides,
          preset: preset.id,
          signal: controller.signal,
        })
      );

      if (controller.signal.aborted) {
        return;
      }

      // Marked done only once the result is used: an aborted render must not
      // block the identical re-run the next effect pass schedules, or the
      // preview would sit on "loading" forever.
      lastKeyRef.current = key;

      if (!result.ok) {
        const failed: RenderPreviewState = {
          issues: result.issues,
          message: result.error,
          status: "error",
          url: keptUrl(),
        };
        settledRef.current = failed;
        show(failed);
        if (result.issues) {
          onRenderIssuesRef.current(result.issues);
        }
        return;
      }

      const url = URL.createObjectURL(result.blob);

      if (frameRef.current) {
        URL.revokeObjectURL(frameRef.current.url);
      }
      frameRef.current = { presetId: preset.id, templateId, url };

      const loaded: RenderPreviewState = { status: "loaded", url };
      settledRef.current = loaded;
      show(loaded);
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
    localeOverrides,
    autoDetected,
    reloadToken,
    renderAdapter,
  ]);

  useEffect(
    () => () => {
      if (frameRef.current) {
        URL.revokeObjectURL(frameRef.current.url);
        frameRef.current = null;
      }
    },
    []
  );

  return render;
};
