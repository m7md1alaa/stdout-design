import { logWarn } from "./logger";

const STORAGE_KEY = "stdout-design:web-ui:state:v1";
const SHARE_PARAM = "share";

export interface PersistedAppState {
  selectedTemplate: string | null;
  selectedPreset: string | null;
  selectedLocale: string | null;
  propStore: Record<string, Record<string, unknown>>;
}

const EMPTY_STATE: PersistedAppState = {
  propStore: {},
  selectedLocale: null,
  selectedPreset: null,
  selectedTemplate: null,
};

const isPersistedAppState = (value: unknown): value is PersistedAppState => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    (v.selectedTemplate === null || typeof v.selectedTemplate === "string") &&
    (v.selectedPreset === null || typeof v.selectedPreset === "string") &&
    (v.selectedLocale === null || typeof v.selectedLocale === "string") &&
    typeof v.propStore === "object" &&
    v.propStore !== null
  );
};

export const loadPersistedState = (): PersistedAppState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return EMPTY_STATE;
    }
    const parsed = JSON.parse(raw) as unknown;
    return isPersistedAppState(parsed) ? parsed : EMPTY_STATE;
  } catch (error) {
    logWarn("Failed to read persisted studio state", { error: String(error) });
    return EMPTY_STATE;
  }
};

export const savePersistedState = (state: PersistedAppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logWarn("Failed to save studio state", { error: String(error) });
  }
};

export interface SharePayload {
  templateId: string;
  presetId: string | null;
  localeId: string | null;
  props: Record<string, unknown>;
}

const encodeBase64Url = (json: string): string =>
  btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");

const decodeBase64Url = (encoded: string): string => {
  const padded = encoded.replaceAll("-", "+").replaceAll("_", "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  return decodeURIComponent(escape(atob(withPadding)));
};

export const buildShareUrl = (payload: SharePayload): string => {
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(SHARE_PARAM, encoded);
  return url.toString();
};

const isSharePayload = (value: unknown): value is SharePayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.templateId === "string" &&
    (v.presetId === null || typeof v.presetId === "string") &&
    (v.localeId === null || typeof v.localeId === "string") &&
    typeof v.props === "object" &&
    v.props !== null
  );
};

/**
 * Reads and strips the share param from the current URL — a one-time import.
 * After this, the app's own persisted state is the source of truth, so the
 * URL doesn't keep growing stale as props change.
 */
export const consumeShareParam = (): SharePayload | null => {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get(SHARE_PARAM);
  if (!raw) {
    return null;
  }

  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, "", url.toString());

  try {
    const decoded = JSON.parse(decodeBase64Url(raw)) as unknown;
    return isSharePayload(decoded) ? decoded : null;
  } catch (error) {
    logWarn("Failed to parse shared studio link", { error: String(error) });
    return null;
  }
};
