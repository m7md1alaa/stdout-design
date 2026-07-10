import { logError } from "./logger";
import type { RenderAdapter, ValidationIssue } from "./renderer";

const parseIssues = (
  json: Record<string, unknown>
): ValidationIssue[] | undefined => {
  const raw = json.issues;
  if (!Array.isArray(raw)) {
    return undefined;
  }
  return raw.map((issue: Record<string, unknown>) => ({
    code: String(issue.code ?? ""),
    message: String(issue.message ?? ""),
    path: Array.isArray(issue.path) ? issue.path.join(".") : "",
  }));
};

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
        let issues: ValidationIssue[] | undefined;
        try {
          const json = (await response.json()) as Record<string, unknown>;
          message = String(json.error ?? message);
          issues = parseIssues(json);
        } catch {
          // Response body wasn't JSON — use default message.
        }
        return { error: message, issues, ok: false };
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
