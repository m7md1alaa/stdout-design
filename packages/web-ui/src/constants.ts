const DEV_SERVER_PORT = 3030;
const DEV_SERVER_HOST = `http://localhost:${DEV_SERVER_PORT}`;

export const API_BASE = import.meta.env.DEV ? DEV_SERVER_HOST : "";

export const API_ROUTES = {
  cacheClean: `${API_BASE}/cache/clean`,
  cacheStats: `${API_BASE}/cache/stats`,
  config: `${API_BASE}/config`,
  events: `${API_BASE}/events`,
  locales: `${API_BASE}/locales`,
  measure: `${API_BASE}/measure`,
  presets: `${API_BASE}/presets`,
  templates: `${API_BASE}/templates`,
} as const;
