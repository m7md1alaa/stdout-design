import type { ComponentType } from "react";
import { createElement } from "react";

import { renderToPixels } from "../node/renderer.js";
import { compileTemplate } from "../shared/render.js";
import type { PropSchema } from "../shared/validation.js";
import { validateProps } from "../shared/validation.js";
import { generateOutputFilename } from "./naming.js";
import { ensureDir } from "./utils.js";

export interface SingleInput {
  // eslint-disable-next-line typescript/no-explicit-any
  component: ComponentType<any>;
  propsSchema: PropSchema;
  props: Record<string, unknown>;
  preset: { id: string; width: number; height: number };
  outDir?: string;
  format?: "webp" | "png" | "jpeg" | "ico" | "raw";
}

export interface SingleOutput {
  outputPath: string;
}

export const renderComponent = async (
  input: SingleInput
): Promise<SingleOutput> => {
  const {
    component,
    format = "png",
    outDir = "./out",
    preset,
    props,
    propsSchema,
  } = input;

  const validated = validateProps(propsSchema, props);
  const element = createElement(
    component,
    validated as Record<string, unknown>
  );
  const compiled = await compileTemplate(element);

  const { bytes } = await renderToPixels(
    compiled,
    { height: preset.height, width: preset.width },
    { format }
  );

  const filename = generateOutputFilename({
    locale: "default",
    presetId: preset.id,
    rowKey: "single",
    templateId: "single",
  });

  const outputPath = `${outDir}/${filename}`;
  await ensureDir(outDir);
  await Bun.write(outputPath, bytes as unknown as Uint8Array);

  return { outputPath };
};
