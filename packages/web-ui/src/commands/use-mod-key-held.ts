import { useKeyHold } from "@tanstack/react-hotkeys";

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/iu.test(navigator.platform || navigator.userAgent);

const MOD_KEY_NAME = isMac ? "Meta" : "Control";

/** Tracks whether the platform's primary modifier (Cmd on macOS, Ctrl elsewhere) is held. */
export const useModKeyHeld = (): boolean => useKeyHold(MOD_KEY_NAME);
