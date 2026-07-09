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
      <div className="prop-field">
        <label htmlFor={`prop-${name}`}>{label}</label>
        <div className="prop-color-row">
          <input
            id={`prop-${name}`}
            type="color"
            value={currentValue as string}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            value={currentValue as string}
            onChange={(e) => onChange(e.target.value)}
            className="prop-color-text"
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
      <div className="prop-field">
        <label htmlFor={`prop-${name}`}>{label}</label>
        {hasRange ? (
          <div className="prop-slider-row">
            <input
              id={`prop-${name}`}
              type="range"
              min={min}
              max={max}
              step="1"
              value={Number(currentValue)}
              onChange={(e) => onChange(Number(e.target.value))}
            />
            <span className="prop-value-label">{String(currentValue)}</span>
          </div>
        ) : (
          <input
            id={`prop-${name}`}
            type="number"
            value={Number(currentValue)}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        )}
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <div className="prop-field prop-field-toggle">
        <label htmlFor={`prop-${name}`}>{label}</label>
        <input
          id={`prop-${name}`}
          type="checkbox"
          checked={Boolean(currentValue)}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
    );
  }

  if (type === "array") {
    return (
      <div className="prop-field">
        <label>{label}</label>
        <div className="prop-tags">
          {(currentValue as string[])?.map((tag: string, i: number) => (
            <span key={i} className="prop-tag">
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
        />
      </div>
    );
  }

  // Default: string/text
  const isLongText = ((schema.description as string) ?? "").length > 60;

  return (
    <div className="prop-field">
      <label htmlFor={`prop-${name}`}>{label}</label>
      {isLongText ? (
        <textarea
          id={`prop-${name}`}
          value={currentValue as string}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          id={`prop-${name}`}
          type="text"
          value={currentValue as string}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
};
