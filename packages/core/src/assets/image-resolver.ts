import { prepareImages } from "@takumi-rs/helpers";
import { extractEmojis } from "@takumi-rs/helpers/emoji";
import type { EmojiType } from "@takumi-rs/helpers/emoji";
import type { Node } from "takumi-js";

import { logDebug, logWarn } from "../shared/logger.js";
import { BoundedImageFetchCache } from "./bounded-image-fetch-cache.js";
import type { ImageFetchCacheLike } from "./bounded-image-fetch-cache.js";

/**
 * Image & Emoji Resolution -- see docs/adr/0018-image-emoji-resolution-module.md.
 *
 * Runs *after* compile (the `Node` tree already exists) and *before*
 * render: it's the one place `<img src>` / `backgroundImage` / `maskImage`
 * URLs referenced by a compiled template actually get fetched. Neither the
 * native `@takumi-rs/core` `Renderer.render()` (pre-fetched images only)
 * nor `compileTemplate` (layout only) does this on their own.
 *
 * Fetch POLICY (`allowUrl`, `maxBytes`, `timeout`, `fetch`) must come from
 * a trusted, non-request-influenced source (studio.config.ts /
 * OgResponseOptions) -- never from template props. `allowUrl` defaults to
 * deny-all: unset means "fetch nothing," not "fetch anything." The one
 * caller with an open, unauthenticated HTTP surface (dev-server's
 * `/render`) is exactly the caller whose props are attacker-influenced, so
 * a default-allow policy here would turn "images don't work" into "images
 * fetch anything the request body points at."
 */

/**
 * A URL was rejected by the configured `allowUrl` policy (or by the
 * default deny-all when no policy is configured at all). Thrown instead of
 * the underlying library's plain `Error` so callers -- e.g. dev-server's
 * `/render` handler -- can distinguish "blocked by policy" (an actionable,
 * user-facing issue) from any other fetch failure (timeout, 404, oversized
 * body) and shape the response accordingly.
 */
export class ImagePolicyBlockedError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Blocked by image fetch policy: ${url}`);
    this.name = "ImagePolicyBlockedError";
    this.url = url;
  }
}

/**
 * `prepareImages` throws a plain `Error` with this exact prefix (verified
 * against the installed `@takumi-rs/helpers` at
 * `packages/core/scratch-images-probe.mjs` during development -- not a
 * documented, versioned contract) when `allowUrl` returns false for a URL.
 * Matched here so a policy rejection can be rethrown as
 * `ImagePolicyBlockedError`; any other error message passes through
 * unchanged.
 */
const ALLOW_URL_BLOCKED_PREFIX = "URL blocked by allowUrl policy: ";

/** Deny every URL. The safe default until a project opts in via `studio.config.ts`'s `images.allowUrl`. */
const denyAll = (): boolean => false;

export interface ImagePolicy {
  /** Return true to permit fetching a URL. Unset denies every URL -- see the module doc comment. */
  allowUrl?: (url: string) => boolean;
  /** Reject a fetched body past this size, by content-length or streamed. @default 32 MiB (the library default) */
  maxBytes?: number;
  /** Abort a fetch after this many milliseconds. @default 5000 (the library default) */
  timeout?: number;
  /** Custom fetch implementation. @default globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /**
   * Emoji provider. `"from-font"` skips network extraction entirely and
   * relies on a registered COLR font to supply emoji glyphs directly.
   * Unset also skips extraction (emoji render as whatever glyph the
   * fallback font stack provides, typically monochrome or missing).
   */
  emoji?: EmojiType | "from-font";
}

export interface ImageSourceEntry {
  src: string;
  data: ArrayBuffer | Uint8Array;
}

export interface ImageResolution {
  /** The node tree to render -- identical to the input unless emoji extraction ran, in which case emoji glyphs are replaced with image nodes. */
  node: Node;
  /** Ready to hand to `RenderOptions.images`. */
  images: ImageSourceEntry[];
}

/**
 * One fetch-byte cache shared for the process lifetime -- same scope as
 * `assets-resolver.ts`'s per-locale `fontCache` and the decode cache on
 * the renderer singleton (`engine/renderer.ts`'s `activeRenderer`). A
 * single project per process (studio dev-server, one CLI batch run, one
 * deployed OG route) means no multi-tenant leak risk from sharing it.
 *
 * Collapses concurrent duplicate fetches (single-flight, via Promise
 * caching -- verified in `scratch-images-probe.mjs`: 3 concurrent
 * requesters of the same uncached URL produced exactly 1 real HTTP
 * request) and reuses bytes across renders sharing an image URL, e.g. a
 * batch matrix's repeated logo/background across every locale x preset
 * cell. See ADR-0018's complexity discussion.
 */
let sharedFetchCache: BoundedImageFetchCache | null = null;

const getSharedFetchCache = (): BoundedImageFetchCache => {
  if (!sharedFetchCache) {
    sharedFetchCache = new BoundedImageFetchCache();
  }
  return sharedFetchCache;
};

/** Forces the next `resolveImages` call to construct a fresh shared fetch cache. */
export const __resetImageFetchCacheForTesting = (): void => {
  sharedFetchCache = null;
};

export interface ImageResolverDeps {
  prepareImages?: typeof prepareImages;
  extractEmojis?: typeof extractEmojis;
  fetchCache?: ImageFetchCacheLike;
}

const isAllowUrlBlockedError = (error: unknown): error is Error =>
  error instanceof Error && error.message.startsWith(ALLOW_URL_BLOCKED_PREFIX);

/**
 * Resolves every remote image (and, if `policy.emoji` is set to a real
 * provider, emoji glyph) a compiled node tree references. Returns the node
 * with emoji extracted (identical to the input if `policy.emoji` is unset
 * or `"from-font"`) plus the fetched image bytes, ready for
 * `RenderOptions.images`.
 */
export const resolveImages = async (
  node: Node,
  policy?: ImagePolicy,
  deps?: ImageResolverDeps
): Promise<ImageResolution> => {
  const prepareImagesFn = deps?.prepareImages ?? prepareImages;
  const extractEmojisFn = deps?.extractEmojis ?? extractEmojis;
  const fetchCache = deps?.fetchCache ?? getSharedFetchCache();

  const resolvedNode =
    policy?.emoji && policy.emoji !== "from-font"
      ? extractEmojisFn(node, policy.emoji)
      : node;

  try {
    const images = await prepareImagesFn({
      allowUrl: policy?.allowUrl ?? denyAll,
      fetch: policy?.fetch,
      fetchCache,
      maxBytes: policy?.maxBytes,
      node: resolvedNode,
      timeout: policy?.timeout,
    });

    logDebug("image-resolver: resolved images", { count: images.length });

    return { images: images as ImageSourceEntry[], node: resolvedNode };
  } catch (error: unknown) {
    if (isAllowUrlBlockedError(error)) {
      const url = error.message.slice(ALLOW_URL_BLOCKED_PREFIX.length);
      throw new ImagePolicyBlockedError(url);
    }
    logWarn("image-resolver: image fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
