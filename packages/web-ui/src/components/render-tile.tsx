import { useRenderPreview } from "@/hooks/use-render-preview";
import type { RenderPreviewInput } from "@/hooks/use-render-preview";
import type { RenderAdapter, ValidationIssue } from "@/lib/renderer";
import { cn } from "@/lib/utils";

interface RenderTileProps {
  input: RenderPreviewInput;
  renderAdapter: RenderAdapter;
  label: string;
  detail?: string;
  /** Makes the tile a button that selects what it shows. */
  onSelect?: () => void;
  /** Marks the tile as the one the canvas currently shows. */
  current?: boolean;
}

// Tiles are read-only views: the main canvas owns the issues shown on fields.
const ignoreIssues = (issues: ValidationIssue[]): number => issues.length;

/** One render of the current template at one preset and locale, with a caption. */
export const RenderTile = ({
  input,
  renderAdapter,
  label,
  detail,
  onSelect,
  current = false,
}: RenderTileProps) => {
  const render = useRenderPreview(input, renderAdapter, ignoreIssues);
  const { preset } = input;
  const loading = !render || render.status === "loading";
  const failed = render?.status === "error";

  const frame = (
    <div
      aria-busy={loading}
      className="bg-muted relative w-full overflow-hidden rounded-md"
      style={
        preset
          ? { aspectRatio: `${preset.width} / ${preset.height}` }
          : undefined
      }
    >
      {render?.url ? (
        <img
          alt={`${label} preview`}
          className="size-full object-contain"
          draggable={false}
          src={render.url}
        />
      ) : null}
      {failed ? (
        <p
          className="bg-background/90 text-destructive-foreground absolute inset-x-0 bottom-0 p-2 text-xs"
          role="alert"
        >
          {render?.message || "Render failed"}
        </p>
      ) : null}
      <div
        aria-hidden="true"
        className="bg-foreground/60 absolute inset-x-0 top-0 h-0.5 animate-pulse opacity-0 transition-opacity duration-150 data-[loading=true]:opacity-100 data-[loading=true]:delay-200"
        data-loading={loading}
      />
    </div>
  );

  const caption = (
    <span className="mt-2 flex items-baseline justify-between gap-2 font-mono text-xs">
      <span className="text-foreground truncate font-medium">{label}</span>
      {detail ? (
        <span className="text-muted-foreground tabular-nums">{detail}</span>
      ) : null}
    </span>
  );

  if (onSelect) {
    return (
      <button
        aria-current={current ? "true" : undefined}
        className={cn(
          "focus-visible:ring-ring hover:bg-accent/50 flex min-w-0 cursor-pointer flex-col rounded-lg p-2 text-left transition-colors duration-150 outline-none focus-visible:ring-2",
          current && "bg-accent/50 ring-border ring-1"
        )}
        onClick={onSelect}
        type="button"
      >
        {frame}
        {caption}
      </button>
    );
  }

  return (
    <div className="flex min-w-0 flex-col p-2">
      {frame}
      {caption}
    </div>
  );
};
