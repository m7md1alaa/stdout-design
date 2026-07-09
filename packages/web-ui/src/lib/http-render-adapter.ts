import { logError } from "./logger";
import type { RenderAdapter } from "./renderer";

export const createHttpRenderAdapter = (baseUrl: string): RenderAdapter => {
  const render: RenderAdapter["render"] = async (
    templateId,
    props,
    options
  ) => {
    const body: Record<string, unknown> = {
      props,
      templateId,
    };

    if (options?.preset) {
      body.preset = options.preset;
    }

    if (options?.locale) {
      body.locale = options.locale;
    }

    try {
      const response = await fetch(`${baseUrl}/render`, {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: options?.signal,
      });

      if (!response.ok) {
        let message = "Render failed";
        try {
          const json = (await response.json()) as { error?: string };
          message = json.error ?? message;
        } catch {
          // Response body wasn't JSON — use default message.
        }
        return { error: message, ok: false };
      }

      const blob = await response.blob();
      return { blob, ok: true };
    } catch (error) {
      if (options?.signal?.aborted) {
        return { error: "Aborted", ok: false };
      }
      logError("RENDER_FAILED", "Render request failed", {
        error: String(error),
        templateId,
      });
      return { error: String(error), ok: false };
    }
  };

  return { render };
};
