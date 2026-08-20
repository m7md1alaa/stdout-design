import { useEffect, useRef } from "react";

import { API_ROUTES } from "../constants";
import { logWarn } from "../lib/logger";

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 15_000;

export interface SSEReloadEvent {
  type: string;
  templateId?: string;
}

/**
 * Subscribes to the dev-server's /events SSE stream for file-watch reload
 * notifications. Reconnects with capped exponential backoff.
 */
export const useSSE = (onReload: (event: SSEReloadEvent) => void) => {
  const onReloadRef = useRef(onReload);

  useEffect(() => {
    onReloadRef.current = onReload;
  }, [onReload]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let eventSource: EventSource | undefined;
    let attempt = 0;
    let stopped = false;

    const connect = () => {
      if (stopped) {
        return;
      }

      eventSource = new EventSource(API_ROUTES.events);

      eventSource.addEventListener("connected", () => {
        attempt = 0;
      });

      eventSource.addEventListener("reload", (event) => {
        try {
          const data = JSON.parse(
            (event as MessageEvent).data
          ) as SSEReloadEvent;
          onReloadRef.current(data);
        } catch (error) {
          logWarn("Malformed SSE event received", {
            data: (event as MessageEvent).data,
            error: String(error),
          });
        }
      });

      eventSource.addEventListener("error", () => {
        eventSource?.close();

        if (stopped) {
          return;
        }

        attempt += 1;
        if (attempt > MAX_RECONNECT_ATTEMPTS) {
          logWarn(
            `Lost connection to dev server after ${MAX_RECONNECT_ATTEMPTS} attempts. ` +
              "Hot-reload is paused. Refresh the page once the dev server is back up."
          );
          return;
        }

        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * 2 ** (attempt - 1),
          MAX_RECONNECT_DELAY_MS
        );
        reconnectTimer = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, []);
};
