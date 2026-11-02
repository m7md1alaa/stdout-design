import { useMemo } from "react";

import { UsedColorsContext } from "@/components/ui/color-picker";
import { groupFields } from "@/lib/field-groups";
import { flattenSchema, getNestedValue } from "@/lib/template-props";
import { collectUsedColors } from "@/lib/used-colors";

import { PropField } from "./prop-field";
import type { FieldEditor } from "./prop-field";

interface PropPanelProps {
  schema: Record<string, unknown>;
  /** What each field shows: for a locale, its text with that locale's layers applied. */
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  inspector?: [string, string[]][];
  editor: FieldEditor;
  /** Whether the field differs from what it would show untouched; drives the reset dot. */
  isModified: (path: string) => boolean;
  onReset: (path: string) => void;
}

export const PropPanel = ({
  schema,
  values,
  errors,
  inspector,
  editor,
  isModified,
  onReset,
}: PropPanelProps) => {
  const fields = useMemo(() => flattenSchema(schema), [schema]);
  const groups = useMemo(
    () => groupFields(fields, inspector),
    [fields, inspector]
  );
  const usedColors = collectUsedColors(fields, values);

  if (groups.length === 0) {
    return (
      <div className="text-muted-foreground px-5 py-10 text-center">
        <p>This template has no editable props</p>
      </div>
    );
  }

  const showHeadings = groups.length > 1;

  return (
    <UsedColorsContext value={usedColors}>
      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <section
            aria-label={group.title}
            className="border-border border-b px-4 py-3 last:border-b-0"
            key={group.title}
          >
            {showHeadings ? (
              <h3 className="text-muted-foreground mb-1 text-xs font-medium">
                {group.title}
              </h3>
            ) : null}
            {group.fields.map(({ path, schema: propSchema }) => (
              <PropField
                editor={editor}
                errors={errors}
                key={path}
                modified={isModified(path)}
                onReset={() => onReset(path)}
                path={path}
                schema={propSchema}
                value={getNestedValue(values, path)}
              />
            ))}
          </section>
        ))}
      </div>
    </UsedColorsContext>
  );
};
