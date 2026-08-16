import { useState, useEffect, useCallback, useRef } from "react";

import { API_ROUTES } from "../constants";
import { logError } from "../lib/logger";

export interface TemplateSchema {
  id: string;
  description: string;
  propsSchema: Record<string, unknown>;
  contentHash: string;
  status?: "ok" | "error";
  errorMessage?: string;
}

export interface PresetData {
  id: string;
  width: number;
  height: number;
  platform: string;
}

interface ConfigData {
  presets: PresetData[];
  defaultPreset: string | undefined;
  locales: string[];
  outDir: string;
}

const parseJsonResponse = async <T>(
  response: Response,
  label: string
): Promise<T> => {
  if (!response.ok) {
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ?? "";
    } catch {
      // Response body wasn't JSON (or was empty) -- fall back to status text only.
    }
    throw new Error(
      `Failed to load ${label}: ${response.status} ${response.statusText}${detail ? ` - ${detail}` : ""}`
    );
  }
  return response.json() as Promise<T>;
};

export const useTemplates = () => {
  const [templates, setTemplates] = useState<TemplateSchema[]>([]);
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isReload = false) => {
    try {
      const [templatesRes, configRes] = await Promise.all([
        fetch(API_ROUTES.templates),
        fetch(API_ROUTES.config),
      ]);

      const [templatesData, configData] = await Promise.all([
        parseJsonResponse<TemplateSchema[]>(templatesRes, "templates"),
        parseJsonResponse<ConfigData>(configRes, "config"),
      ]);

      setTemplates(templatesData);
      setConfig(configData);
      setError(null);
      // oxlint-disable-next-line unicorn/catch-error-name
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Failed to load studio data";
      logError("TEMPLATES_FETCH_FAILED", message);
      if (!isReload) {
        setError(message);
      }
    } finally {
      setInitialLoading(false);
      setReloading(false);
    }
  }, []);

  const reload = useCallback(() => {
    setReloading(true);
    fetchData(true);
  }, [fetchData]);

  const initialisedRef = useRef(false);

  useEffect(() => {
    if (initialisedRef.current) {
      return;
    }
    initialisedRef.current = true;
    fetchData();
  }, [fetchData]);

  const defaultPreset =
    config?.defaultPreset ?? config?.presets?.[0]?.id ?? null;

  return {
    config,
    defaultPreset,
    error,
    initialLoading,
    loading: initialLoading && !reloading,
    locales: config?.locales ?? [],
    presets: config?.presets ?? [],
    reload,
    reloading,
    templates,
  };
};
