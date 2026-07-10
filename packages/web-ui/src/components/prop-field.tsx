interface PropFieldProps {
  name: string;
  schema: Record<string, unknown>;
  value: unknown;
  onChange: (value: unknown) => void;
}

const isColorField = (
  name: string,
  schema: Record<string, unknown>
): boolean => {
  const nameLower = name.toLowerCase();
  return (
    (nameLower.includes("color") || nameLower.includes("colour")) &&
    typeof schema.default === "string" &&
    (schema.default as string).startsWith("#")
  );
};

export const PropField = ({
  name,
  schema,
  value,
  onChange,
}: PropFieldProps) => {
  const label = (schema.description as string) ?? name;
  const type = schema.type as string;
  const defaultValue = schema.default;
  const currentValue = value ?? defaultValue ?? "";

  if (isColorField(name, schema)) {
    return (
      <div className="mb-3">
        <label
          htmlFor={`prop-${name}`}
          className="mb-1 block text-xs font-medium text-content-secondary"
        >
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`prop-${name}`}
            type="color"
            value={currentValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-sm border border-border bg-none p-0"
          />
          <input
            type="text"
            value={currentValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 rounded-sm border border-border bg-surface-tertiary px-2.5 py-1.5 font-mono text-xs text-content focus:border-accent focus:outline-none"
          />
        </div>
      </div>
    );
  }

  if (type === "number") {
    const min = schema.minimum as number | undefined;
    const max = schema.maximum as number | undefined;
    const hasRange = min !== undefined && max !== undefined;

    return (
      <div className="mb-3">
        <label
          htmlFor={`prop-${name}`}
          className="mb-1 block text-xs font-medium text-content-secondary"
        >
          {label}
        </label>
        {hasRange ? (
          <div className="flex items-center gap-2">
            <input
              id={`prop-${name}`}
              type="range"
              min={min}
              max={max}
              step="1"
              value={Number(currentValue)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="min-w-[30px] text-right font-mono text-xs text-content-tertiary">
              {String(currentValue)}
            </span>
          </div>
        ) : (
          <input
            id={`prop-${name}`}
            type="number"
            value={Number(currentValue)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full rounded-sm border border-border bg-surface-tertiary px-2.5 py-1.5 font-mono text-xs text-content focus:border-accent focus:outline-none"
          />
        )}
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="mb-3 flex items-center justify-between">
        <label
          htmlFor={`prop-${name}`}
          className="text-xs font-medium text-content-secondary"
        >
          {label}
        </label>
        <input
          id={`prop-${name}`}
          type="checkbox"
          checked={Boolean(currentValue)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-accent"
        />
      </div>
    );
  }

  if (type === "array") {
    return (
      <div className="mb-3">
        <label className="mb-1 block text-xs font-medium text-content-secondary">
          {label}
        </label>
        <div className="mb-1.5 flex flex-wrap gap-1">
          {(currentValue as string[])?.map((tag: string, i: number) => (
            <span
              key={i}
              className="inline-block rounded-[10px] bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent-hover"
            >
              {tag}
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="Add item and press Enter..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const input = e.currentTarget;
              const val = input.value.trim();
              if (val) {
                const arr = Array.isArray(currentValue)
                  ? [...currentValue]
                  : [];
                onChange([...arr, val]);
                input.value = "";
              }
            }
          }}
          className="w-full rounded-sm border border-border bg-surface-tertiary px-2.5 py-1.5 font-mono text-xs text-content focus:border-accent focus:outline-none"
        />
      </div>
    );
  }

  const isLongText = ((schema.description as string) ?? "").length > 60;

  return (
    <div className="mb-3">
      <label
        htmlFor={`prop-${name}`}
        className="mb-1 block text-xs font-medium text-content-secondary"
      >
        {label}
      </label>
      {isLongText ? (
        <textarea
          id={`prop-${name}`}
          value={currentValue as string}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-sm border border-border bg-surface-tertiary px-2.5 py-1.5 font-mono text-xs text-content focus:border-accent focus:outline-none"
        />
      ) : (
        <input
          id={`prop-${name}`}
          type="text"
          value={currentValue as string}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-sm border border-border bg-surface-tertiary px-2.5 py-1.5 font-mono text-xs text-content focus:border-accent focus:outline-none"
        />
      )}
    </div>
  );
};
