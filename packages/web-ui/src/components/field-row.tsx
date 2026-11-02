import type * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  /** Id of the control the label points at. */
  controlId: string;
  label: string;
  /** `inline`: label left, control right. `stacked`: label above the control. */
  layout: "inline" | "stacked";
  hint?: string;
  error?: string;
  /** Whether the value differs from its default; shows the reset dot. */
  modified?: boolean;
  onReset?: () => void;
  /** Extra props for the label, e.g. to scrub a number by dragging it. */
  labelProps?: React.ComponentProps<typeof Label>;
  /** Content aligned to the right of a stacked label (a count, an Add button). */
  actions?: React.ReactNode;
  /** Set when the value is edited for one locale only; shown next to the label. */
  locale?: string;
  children: React.ReactNode;
}

const ResetDot = ({
  label,
  onReset,
}: {
  label: string;
  onReset: () => void;
}) => (
  <button
    aria-label={`Reset ${label} to default`}
    className="group/reset -m-1 flex shrink-0 cursor-pointer items-center justify-center p-1 outline-none"
    onClick={onReset}
    title="Reset to default"
    type="button"
  >
    <span className="bg-foreground/60 group-hover/reset:bg-foreground group-focus-visible/reset:ring-ring block size-1.5 rounded-full transition-colors duration-150 group-focus-visible/reset:ring-2" />
  </button>
);

/** Marks a field whose value is this locale's own; other locales keep theirs. */
const LocaleTag = ({ locale }: { locale: string }) => (
  <span
    className="text-muted-foreground border-border shrink-0 rounded-sm border px-1 font-mono text-[10px] leading-3.5"
    title={`Edits change ${locale} only`}
  >
    {locale}
  </span>
);

/** One row of the inspector: label, reset dot, control, hint, and error. */
export const FieldRow = ({
  controlId,
  label,
  layout,
  hint,
  error,
  modified,
  onReset,
  labelProps,
  actions,
  locale,
  children,
}: FieldRowProps) => {
  const { className: labelClassName, ...restLabelProps } = labelProps ?? {};
  const labelNode = (
    <span className="flex min-w-0 items-center gap-1.5">
      <Label
        className={cn(
          "text-foreground/80 min-w-0 truncate text-xs font-medium sm:text-xs",
          labelClassName
        )}
        htmlFor={controlId}
        {...restLabelProps}
      >
        {label}
      </Label>
      {locale ? <LocaleTag locale={locale} /> : null}
      {modified && onReset ? (
        <ResetDot label={label} onReset={onReset} />
      ) : null}
    </span>
  );

  return (
    <div className="py-1.5">
      {layout === "inline" ? (
        <div className="grid min-h-8 grid-cols-[6rem_minmax(0,1fr)] items-center gap-3">
          {labelNode}
          {children}
        </div>
      ) : (
        <>
          <div className="mb-1.5 flex min-h-5 items-center justify-between gap-2">
            {labelNode}
            {actions}
          </div>
          {children}
        </>
      )}
      {hint ? (
        <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive-foreground mt-1 text-[11px] leading-tight">
          {error}
        </p>
      ) : null}
    </div>
  );
};
