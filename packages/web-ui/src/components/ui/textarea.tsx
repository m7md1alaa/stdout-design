import type * as React from "react";

import { cn } from "@/lib/utils";

/** Multi-line counterpart of `Input`: same border, fill, focus ring and error state. */
export const Textarea = ({
  className,
  ...props
}: React.ComponentProps<"textarea">): React.ReactElement => (
  <textarea
    className={cn(
      "border-input bg-background text-foreground placeholder:text-muted-foreground/72 ring-ring/24 focus-visible:border-ring aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/16 dark:bg-input/32 dark:aria-invalid:ring-destructive/24 field-sizing-content min-h-16 w-full resize-y rounded-lg border px-[calc(--spacing(3)-1px)] py-1.5 text-base shadow-xs/5 transition-shadow outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-64 sm:text-sm",
      className
    )}
    data-slot="textarea"
    {...props}
  />
);
