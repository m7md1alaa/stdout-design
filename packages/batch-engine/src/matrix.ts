import type { Preset } from "@stdout-design/core";

import type { MatrixCell } from "./types.js";

export interface MatrixLocaleInput {
  id: string;
  data?: Record<string, unknown>;
}

export interface DataRow {
  key?: string;
  id?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface MatrixInput {
  rows: DataRow[];
  locales: MatrixLocaleInput[];
  presets: Pick<Preset, "id" | "width" | "height">[];
  baseProps?: Record<string, unknown>;
}

const mergeLocale = (
  props: Record<string, unknown>,
  localeData?: Record<string, unknown>
): Record<string, unknown> => {
  if (!localeData) {
    return props;
  }

  const merged = { ...props };
  for (const [key, value] of Object.entries(localeData)) {
    if (typeof value === "string" && typeof merged[key] === "string") {
      merged[key] = value;
    }
  }

  return merged;
};

/**
 * Expands rows × locales × presets into a flat array of matrix cells.
 * Locale data is merged into props during expansion so each cell carries
 * fully resolved props.
 */
export const expandMatrix = (input: MatrixInput): MatrixCell[] => {
  const { rows, locales, presets, baseProps = {} } = input;

  if (rows.length === 0) {
    return [];
  }

  const cells: MatrixCell[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    const rowKey = String(row.key ?? row.id ?? row.slug ?? String(rowIndex));
    const rowProps = { ...baseProps, ...row };
    delete rowProps.key;
    delete rowProps.id;
    delete rowProps.slug;

    for (const locale of locales) {
      const localeProps = mergeLocale(rowProps, locale.data);

      for (const preset of presets) {
        cells.push({
          locale: locale.id,
          preset: { height: preset.height, id: preset.id, width: preset.width },
          props: localeProps,
          rowIndex,
          rowKey,
        });
      }
    }
  }

  return cells;
};
