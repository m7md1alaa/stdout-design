import { cn } from "@/lib/utils";

interface SegmentedProps {
  id?: string;
  label: string;
  options: string[];
  /** Text for an option when it should differ from its value. */
  labels?: Record<string, string>;
  value: string;
  onValueChange: (value: string) => void;
}

/** Joined toggle buttons, one pressed at a time; for a handful of short options. */
export const Segmented = ({
  id,
  label,
  options,
  labels,
  value,
  onValueChange,
}: SegmentedProps) => (
  <fieldset
    aria-label={label}
    className="bg-muted m-0 flex w-full min-w-0 gap-0.5 rounded-md border-0 p-0.5"
    id={id}
  >
    {options.map((option) => {
      const selected = option === value;
      return (
        <button
          aria-pressed={selected}
          className={cn(
            "focus-visible:ring-ring min-w-0 flex-1 cursor-pointer truncate rounded-[4px] px-2 py-1 text-xs font-medium transition-colors duration-150 outline-none focus-visible:ring-2",
            selected
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
          key={option}
          onClick={() => onValueChange(option)}
          type="button"
        >
          {labels?.[option] ?? option}
        </button>
      );
    })}
  </fieldset>
);
