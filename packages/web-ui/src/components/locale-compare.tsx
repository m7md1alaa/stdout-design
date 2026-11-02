import type { RenderPreviewInput } from "@/hooks/use-render-preview";
import type { RenderAdapter } from "@/lib/renderer";

import { RenderTile } from "./render-tile";

type LocaleSide = Pick<
  RenderPreviewInput,
  "locale" | "autoDetected" | "localeOverrides"
>;

interface LocaleCompareProps {
  /** Everything but the locale; the same props, preset and reload token on both sides. */
  base: Omit<RenderPreviewInput, keyof LocaleSide>;
  primary: LocaleSide;
  /** The locale shown beside it, with its own overrides. */
  secondary: LocaleSide;
  renderAdapter: RenderAdapter;
}

/** Two locales of the same artwork side by side, e.g. `en` next to `ar`. */
export const LocaleCompare = ({
  base,
  primary,
  secondary,
  renderAdapter,
}: LocaleCompareProps) => (
  <div className="bg-background grid min-h-0 flex-1 grid-cols-2 content-start items-start gap-2 overflow-auto p-4">
    <RenderTile
      input={{ ...base, ...primary }}
      label={primary.locale ?? "default"}
      renderAdapter={renderAdapter}
    />
    <RenderTile
      input={{ ...base, ...secondary }}
      label={secondary.locale ?? "default"}
      renderAdapter={renderAdapter}
    />
  </div>
);
