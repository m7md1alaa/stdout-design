import { useCallback } from "react";

import { PropField } from "./prop-field";

interface PropPanelProps {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  onChange: (path: string, value: unknown) => void;
}

const getProperties = (
  schema: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const props = "properties" in schema ? schema.properties : undefined;
  return props as Record<string, unknown> | undefined;
};

export const PropPanel = ({ schema, values, onChange }: PropPanelProps) => {
  const properties = getProperties(schema);

  const handleChange = useCallback(
    (name: string) => (value: unknown) => {
      onChange(name, value);
    },
    [onChange]
  );

  if (!properties || Object.keys(properties).length === 0) {
    return (
      <div className="px-5 py-10 text-center text-content-tertiary">
        <p>This template has no editable props</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pb-2 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
          Props
        </h3>
      </div>
      <div className="px-5 pb-5">
        {Object.entries(properties).map(([name, propSchema]) => (
          <PropField
            key={name}
            name={name}
            schema={propSchema as Record<string, unknown>}
            value={values[name]}
            onChange={handleChange(name)}
          />
        ))}
      </div>
    </div>
  );
};
