import { useEffect, useState } from "react";

import { API_ROUTES } from "../constants";
import type { TranslationPaths } from "../lib/locale-layer";
import { logWarn } from "../lib/logger";

const NO_STRINGS: TranslationPaths = {};

interface Loaded {
  key: string;
  strings: TranslationPaths;
}

/**
 * The locale file's strings for one template, by prop path, from the dev
 * server (core flattens them, so only translatable text arrives). Empty
 * while loading, without a locale, or when the file has nothing for the
 * template. `reloadToken` refetches after the file changes on disk.
 */
export const useLocaleStrings = (
  templateId: string | null,
  locale: string | null,
  reloadToken: number
): TranslationPaths => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key =
    templateId && locale ? `${templateId}\n${locale}\n${reloadToken}` : "";

  useEffect(() => {
    if (!(templateId && locale)) {
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(
          `${API_ROUTES.translations}/${encodeURIComponent(templateId)}/${encodeURIComponent(locale)}`,
          { signal: controller.signal }
        );
        const body = response.ok
          ? ((await response.json()) as { strings?: TranslationPaths })
          : {};
        setLoaded({ key, strings: body.strings ?? NO_STRINGS });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        logWarn("Failed to load locale strings", {
          error: String(error),
          locale,
          templateId,
        });
        setLoaded({ key, strings: NO_STRINGS });
      }
    };
    load();
    return () => controller.abort();
  }, [key, locale, templateId]);

  return loaded?.key === key ? loaded.strings : NO_STRINGS;
};
