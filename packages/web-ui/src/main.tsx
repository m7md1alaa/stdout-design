import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app";
import { CommandScopeProvider } from "./commands/command-scope";

import "./index.css";

const rootElement = document.querySelector("#root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <HotkeysProvider
      defaultOptions={{
        hotkey: { preventDefault: true },
        hotkeySequence: { timeout: 1200 },
      }}
    >
      <CommandScopeProvider>
        <App />
      </CommandScopeProvider>
    </HotkeysProvider>
  </StrictMode>
);
