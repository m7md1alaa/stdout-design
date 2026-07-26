import type { ReactElement } from "react";
import { ImageResponse } from "takumi-js/response";

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

export const createOgResponse = (
  element: ReactElement,
  options?: OgResponseOptions
): ImageResponse => {
  const {
    locale,
    format: explicitFormat,
    height: explicitHeight,
    width: explicitWidth,
    devicePixelRatio: explicitDpr,
    ...rest
  } = options ?? {};

  return new ImageResponse(element, {
    devicePixelRatio: explicitDpr ?? 2,
    format: explicitFormat ?? "webp",
    height: explicitHeight ?? 630,
    width: explicitWidth ?? 1200,
    ...rest,
    lang: locale ?? rest.lang,
  } as ConstructorParameters<typeof ImageResponse>[1]);
};
