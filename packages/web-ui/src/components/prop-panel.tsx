import { useCallback } from "react";

import { flattenSchema, getNestedValue } from "@/lib/template-props";

import { PropField } from "./prop-field";

interface PropPanelProps {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (path: string, value: unknown) => void;
}

export const PropPanel = ({
  schema,
  values,
  errors,
  onChange,
}: PropPanelProps) => {
  const flattened = flattenSchema(schema);

  const handleChange = useCallback(
    (path: string) => (value: unknown) => {
      onChange(path, value);
    },
    [onChange]
  );

  if (flattened.length === 0) {
    return (
      <div className="text-content-tertiary px-5 py-10 text-center">
        <p>This template has no editable props</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-3 pb-2">
        <h3 className="text-content-tertiary text-[11px] font-semibold tracking-wider uppercase">
          Props
        </h3>
      </div>
      <div className="px-5 pb-5">
        {flattened.map(({ name, path, schema: propSchema }) => (
          <PropField
            key={path}
            name={name}
            schema={propSchema}
            value={getNestedValue(values, path)}
            error={errors?.[path]}
            onChange={handleChange(path)}
          />
        ))}
      </div>
    </div>
  );
};
