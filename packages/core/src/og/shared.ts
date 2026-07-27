export const OG_DEFAULT_WIDTH = 1200;
export const OG_DEFAULT_HEIGHT = 630;
export const OG_DEFAULT_FORMAT = "webp";

const ONE_YEAR_SECONDS = 31_536_000;

export const OG_CACHE_CONTROL =
  `public, s-maxage=${ONE_YEAR_SECONDS}, max-age=3600, immutable` as const;

export const createOgErrorResponse = (error?: unknown): Response => {
  if (error) {
    console.error("[og] render failed", error);
  }

  return new Response("Failed to generate OG image", {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status: 500,
  });
};
