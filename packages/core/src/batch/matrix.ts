import type { Preset } from "../shared/types.js";
import type { MatrixCell } from "./types.js";

export interface DataRow {
  key?: string;
  id?: string;
  slug?: string;
  [key: string]: unknown;
}

export interface MatrixInput {
  rows: DataRow[];
  locales: string[];
  presets: Pick<Preset, "id" | "width" | "height">[];
  baseProps?: Record<string, unknown>;
}

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

    for (const localeId of locales) {
      for (const preset of presets) {
        cells.push({
          locale: localeId,
          preset: { height: preset.height, id: preset.id, width: preset.width },
          props: { ...rowProps, locale: localeId },
          rowIndex,
          rowKey,
        });
      }
    }
  }

  return cells;
};
