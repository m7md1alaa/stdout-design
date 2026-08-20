import {
  formatForDisplay,
  useHotkeyRecorder,
  useHotkeySequenceRecorder,
} from "@tanstack/react-hotkeys";
import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { deserializeSequence } from "@/commands/bindings";
import type { CommandDefinition } from "@/commands/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: CommandDefinition[];
  resolveBinding: (command: CommandDefinition) => string;
  isCustomized: (commandId: string) => boolean;
  setBinding: (commandId: string, binding: string) => void;
  resetBinding: (commandId: string) => void;
  recordingIds: ReadonlySet<string>;
  setRowRecording: (id: string, recording: boolean) => void;
}

const RecordButton = ({
  isRecording,
  onStart,
}: {
  isRecording: boolean;
  onStart: () => void;
}) => (
  <Button
    className={cn(isRecording && "border-primary text-primary")}
    onClick={onStart}
    size="xs"
    variant="outline"
  >
    {isRecording ? "Press keys… (Esc to cancel)" : "Edit"}
  </Button>
);

const ResetButton = ({
  label,
  onReset,
}: {
  label: string;
  onReset: () => void;
}) => (
  <Button
    aria-label={`Reset ${label} to default`}
    className="text-content-tertiary hover:bg-transparent hover:text-content"
    onClick={onReset}
    size="icon-xs"
    variant="ghost"
  >
    <RotateCcw size={13} />
  </Button>
);

const RowShell = ({
  command,
  children,
}: {
  command: CommandDefinition;
  children: React.ReactNode;
}) => (
  <li className="flex items-center justify-between gap-3 px-4 py-2.5">
    <div className="min-w-0">
      <p className="truncate text-content text-sm">{command.label}</p>
      {command.description ? (
        <p className="truncate text-content-tertiary text-xs">
          {command.description}
        </p>
      ) : null}
    </div>
    <div className="flex shrink-0 items-center gap-1.5">{children}</div>
  </li>
);

const HotkeyRow = ({
  command,
  binding,
  customized,
  onChange,
  onReset,
  onRecordingChange,
}: {
  command: Extract<CommandDefinition, { kind: "hotkey" }>;
  binding: string;
  customized: boolean;
  onChange: (binding: string) => void;
  onReset: () => void;
  onRecordingChange: (recording: boolean) => void;
}) => {
  const recorder = useHotkeyRecorder({
    onRecord: (hotkey) => {
      onChange(hotkey);
      recorder.stopRecording();
    },
  });

  useEffect(() => {
    onRecordingChange(recorder.isRecording);
  }, [recorder.isRecording, onRecordingChange]);

  return (
    <RowShell command={command}>
      {recorder.isRecording ? null : (
        <kbd className="rounded border border-border bg-surface-tertiary px-1.5 py-0.5 font-mono text-[11px] text-content-secondary">
          {formatForDisplay(binding)}
        </kbd>
      )}
      <RecordButton
        isRecording={recorder.isRecording}
        onStart={() => recorder.startRecording()}
      />
      {customized ? (
        <ResetButton label={command.label} onReset={onReset} />
      ) : null}
    </RowShell>
  );
};

const SequenceRow = ({
  command,
  binding,
  customized,
  onChange,
  onReset,
  onRecordingChange,
}: {
  command: Extract<CommandDefinition, { kind: "sequence" }>;
  binding: string;
  customized: boolean;
  onChange: (binding: string) => void;
  onReset: () => void;
  onRecordingChange: (recording: boolean) => void;
}) => {
  const recorder = useHotkeySequenceRecorder({
    onRecord: (sequence) => {
      onChange(sequence.join(" "));
      recorder.stopRecording();
    },
  });

  useEffect(() => {
    onRecordingChange(recorder.isRecording);
  }, [recorder.isRecording, onRecordingChange]);

  const steps = recorder.isRecording
    ? recorder.steps
    : deserializeSequence(binding);

  return (
    <RowShell command={command}>
      <span className="flex items-center gap-1">
        {steps.length === 0 ? (
          <span className="text-[11px] text-content-tertiary">press keys…</span>
        ) : (
          steps.map((step, i) => (
            <kbd
              className="rounded border border-border bg-surface-tertiary px-1.5 py-0.5 font-mono text-[11px] text-content-secondary"
              key={`${step}-${i}`}
            >
              {formatForDisplay(step)}
            </kbd>
          ))
        )}
      </span>
      <RecordButton
        isRecording={recorder.isRecording}
        onStart={() => recorder.startRecording()}
      />
      {customized ? (
        <ResetButton label={command.label} onReset={onReset} />
      ) : null}
    </RowShell>
  );
};

export const ShortcutsDialog = ({
  open,
  onOpenChange,
  commands,
  resolveBinding,
  isCustomized,
  setBinding,
  resetBinding,
  recordingIds,
  setRowRecording,
}: ShortcutsDialogProps) => (
  <Dialog
    onOpenChange={(next, eventDetails) => {
      // Don't let Escape close the whole dialog while it's just cancelling
      // an in-progress recording — the recorder's own onCancel handles that.
      if (
        !next &&
        recordingIds.size > 0 &&
        eventDetails.reason === "escape-key"
      ) {
        return;
      }
      onOpenChange(next);
    }}
    open={open}
  >
    <DialogContent className="max-w-md p-0">
      <div className="border-border border-b px-4 py-3">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Click Edit and press a new combination to customize any shortcut.
        </DialogDescription>
      </div>
      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
        {commands.map((command) =>
          command.kind === "hotkey" ? (
            <HotkeyRow
              binding={resolveBinding(command)}
              command={command}
              customized={isCustomized(command.id)}
              key={command.id}
              onChange={(binding) => setBinding(command.id, binding)}
              onRecordingChange={(recording) =>
                setRowRecording(command.id, recording)
              }
              onReset={() => resetBinding(command.id)}
            />
          ) : (
            <SequenceRow
              binding={resolveBinding(command)}
              command={command}
              customized={isCustomized(command.id)}
              key={command.id}
              onChange={(binding) => setBinding(command.id, binding)}
              onRecordingChange={(recording) =>
                setRowRecording(command.id, recording)
              }
              onReset={() => resetBinding(command.id)}
            />
          )
        )}
      </ul>
    </DialogContent>
  </Dialog>
);
