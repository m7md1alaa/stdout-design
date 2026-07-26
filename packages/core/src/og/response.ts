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
const ONE_YEAR_SECONDS = 31_536_000;

const CACHE_CONTROL =
  `public, s-maxage=${ONE_YEAR_SECONDS}, max-age=3600, immutable` as const;

/**
 * Creates a fully-cached OG image Response with proper error handling.
 *
 * Uses `ImageResponse.ready` to await render completion before returning,
 * so callers always get either a valid image or a clean 500 — never a
 * broken streaming response.
 */
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

  const format = explicitFormat ?? "webp";

  const response = new ImageResponse(element, {
    devicePixelRatio: explicitDpr ?? 2,
    format,
    headers: {
      "Cache-Control": CACHE_CONTROL,
      Vary: "Accept",
    },
    height: explicitHeight ?? 630,
    ...rest,
    lang: locale ?? rest.lang,
    onError: (error: unknown) => {
      console.error("[og] render failed", error);
    },
    width: explicitWidth ?? 1200,
  } as ConstructorParameters<typeof ImageResponse>[1]);

  try {
    await response.ready;
    return response;
  } catch (error: unknown) {
    console.error("[og] returning 500 after render failure", error);
    return new Response("Failed to generate OG image", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: 500,
    });
  }
};
