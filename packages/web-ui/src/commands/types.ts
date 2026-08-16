export type CommandScope = "global" | "canvas";

interface BaseCommandDefinition {
  id: string;
  label: string;
  description?: string;
  scope: CommandScope;
  isEnabled?: () => boolean;
  run: () => void;
}

export interface HotkeyCommandDefinition extends BaseCommandDefinition {
  kind: "hotkey";
  defaultBinding: string;
  /** Override the library's smart input-filtering default for this command. */
  ignoreInputs?: boolean;
}

export interface SequenceCommandDefinition extends BaseCommandDefinition {
  kind: "sequence";
  defaultBinding: string[];
}

export type CommandDefinition =
  | HotkeyCommandDefinition
  | SequenceCommandDefinition;
