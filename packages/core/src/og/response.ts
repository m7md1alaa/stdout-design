import type { ReactElement } from "react";
import { ImageResponse } from "takumi-js/response";

import {
  OG_CACHE_CONTROL,
  OG_DEFAULT_FORMAT,
  OG_DEFAULT_HEIGHT,
  OG_DEFAULT_WIDTH,
  createOgErrorResponse,
} from "./shared.js";

export interface OgResponseOptions {
  locale?: string;
  width?: number;
  height?: number;
  format?: "webp" | "png" | "jpeg";
  quality?: number;
  lossless?: boolean;
  fonts?: unknown[];
  fontFamilies?: string[];
  lang?: string;
  stylesheets?: string[];
  devicePixelRatio?: number;
}

export const createOgResponse = async (
  element: ReactElement,
  options?: OgResponseOptions
): Promise<Response> => {
  const {
    locale,
    format: explicitFormat,
    height: explicitHeight,
    width: explicitWidth,
    devicePixelRatio: explicitDpr,
    ...rest
  } = options ?? {};

  const format = explicitFormat ?? OG_DEFAULT_FORMAT;

  const response = new ImageResponse(element, {
    devicePixelRatio: explicitDpr ?? 2,
    format,
    headers: {
      "Cache-Control": OG_CACHE_CONTROL,
      Vary: "Accept",
    },
    height: explicitHeight ?? OG_DEFAULT_HEIGHT,
    ...rest,
    lang: locale ?? rest.lang,
    onError: (error: unknown) => {
      console.error("[og] render failed", error);
    },
    width: explicitWidth ?? OG_DEFAULT_WIDTH,
  } as ConstructorParameters<typeof ImageResponse>[1]);

  try {
    await response.ready;
    return response;
  } catch (error: unknown) {
    console.error("[og] returning 500 after render failure", error);
    return createOgErrorResponse();
  }
};
