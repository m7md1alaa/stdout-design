import type { ReactElement } from "react";

import { compileTemplate } from "../engine/render.js";
import { renderToPixels } from "../engine/renderer.js";
import {
  OG_CACHE_CONTROL,
  OG_DEFAULT_FORMAT,
  OG_DEFAULT_HEIGHT,
  OG_DEFAULT_WIDTH,
  createOgErrorResponse,
} from "./shared.js";

export interface OgPipelineOptions {
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpeg";
  devicePixelRatio?: number;
}

export const renderOgResponse = async (
  element: ReactElement,
  options?: OgPipelineOptions
): Promise<Response> => {
  const width = options?.width ?? OG_DEFAULT_WIDTH;
  const height = options?.height ?? OG_DEFAULT_HEIGHT;
  const format = options?.format ?? OG_DEFAULT_FORMAT;

  try {
    const compiled = await compileTemplate(element);
    const { bytes } = await renderToPixels(
      compiled,
      { height, width },
      { format }
    );

    return new Response(bytes, {
      headers: {
        "Cache-Control": OG_CACHE_CONTROL,
        "Content-Type": `image/${format}`,
        Vary: "Accept",
      },
    });
  } catch {
    return createOgErrorResponse();
  }
};
