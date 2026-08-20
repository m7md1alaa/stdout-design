import type { CommandDefinition } from "./types";

export interface AppCommandCallbacks {
  openPalette: () => void;
  openShortcutsHelp: () => void;
  exportPng: () => void;
  copyShareLink: () => void;
  resetProps: () => void;
  canExport: () => boolean;
  canResetProps: () => boolean;
  canCopyShareLink: () => boolean;
}

const focusFirst = (selector: string) => {
  document.querySelector<HTMLElement>(selector)?.focus();
};

/**
 * The app's command list — pure data, decoupled from key bindings (see
 * use-command-bindings.ts) so users can rebind any of these without touching
 * what they actually do.
 */
export const buildAppCommands = (
  callbacks: AppCommandCallbacks
): CommandDefinition[] => [
  {
    defaultBinding: "Mod+K",
    id: "open-command-palette",
    kind: "hotkey",
    label: "Open command palette",
    run: callbacks.openPalette,
    scope: "global",
  },
  {
    defaultBinding: "Mod+/",
    id: "open-shortcuts-help",
    kind: "hotkey",
    label: "Show keyboard shortcuts",
    run: callbacks.openShortcutsHelp,
    scope: "global",
  },
  {
    defaultBinding: "Mod+E",
    description: "Render the current template and download it as a PNG.",
    id: "export-png",
    isEnabled: callbacks.canExport,
    kind: "hotkey",
    label: "Export PNG",
    run: callbacks.exportPng,
    scope: "global",
  },
  {
    defaultBinding: "Mod+Shift+C",
    description:
      "Copy a URL that reopens the studio with this exact template, preset, locale, and props.",
    id: "copy-share-link",
    isEnabled: callbacks.canCopyShareLink,
    kind: "hotkey",
    label: "Copy shareable link",
    run: callbacks.copyShareLink,
    scope: "global",
  },
  {
    // A modifier+Backspace combo collides with the native "delete previous
    // word" behavior in text inputs, and resetting props is destructive —
    // so unlike the other Mod-combos above, this one does NOT fire while a
    // text input/textarea is focused.
    defaultBinding: "Mod+Backspace",
    description: "Discard your edits and restore this template's defaults.",
    id: "reset-props",
    ignoreInputs: true,
    isEnabled: callbacks.canResetProps,
    kind: "hotkey",
    label: "Reset props to defaults",
    run: callbacks.resetProps,
    scope: "global",
  },
  {
    defaultBinding: ["G", "T"],
    id: "go-to-template",
    kind: "sequence",
    label: "Go to: Template selector",
    run: () => focusFirst("#template-select"),
    scope: "canvas",
  },
  {
    defaultBinding: ["G", "P"],
    id: "go-to-props",
    kind: "sequence",
    label: "Go to: Props panel",
    run: () => focusFirst('[id^="prop-"]'),
    scope: "canvas",
  },
];
