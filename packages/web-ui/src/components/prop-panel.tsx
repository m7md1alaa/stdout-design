import { useCallback } from "react";

import { PropField } from "./prop-field";

interface PropPanelProps {
  schema: Record<string, unknown>;
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (path: string, value: unknown) => void;
}

interface FlattenedProp {
  name: string;
  path: string;
  schema: Record<string, unknown>;
}

const getProperties = (
  schema: Record<string, unknown>
): Record<string, unknown> | undefined => {
  const props = "properties" in schema ? schema.properties : undefined;
  return props as Record<string, unknown> | undefined;
};

const flattenSchema = (
  properties: Record<string, unknown>,
  prefix = ""
): FlattenedProp[] => {
  const result: FlattenedProp[] = [];

  for (const [key, propSchema] of Object.entries(properties)) {
    const typed = propSchema as Record<string, unknown>;
    const path = prefix ? `${prefix}.${key}` : key;

    if (typed.type === "object" && typed.properties) {
      result.push(
        ...flattenSchema(typed.properties as Record<string, unknown>, path)
      );
    } else {
      result.push({ name: key, path, schema: typed });
    }
  }

  return result;
};

const getNestedValue = (
  obj: Record<string, unknown>,
  path: string
): unknown => {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

export const PropPanel = ({
  schema,
  values,
  errors,
  onChange,
}: PropPanelProps) => {
  const properties = getProperties(schema);

  const handleChange = useCallback(
    (path: string) => (value: unknown) => {
      onChange(path, value);
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

  const flattened = flattenSchema(properties);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-5 pb-2 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-content-tertiary">
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
