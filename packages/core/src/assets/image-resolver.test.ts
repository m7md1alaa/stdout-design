import { beforeEach, describe, expect, it, mock } from "bun:test";

import type { Node } from "takumi-js";

import { BoundedImageFetchCache } from "./bounded-image-fetch-cache.js";
import type { ImageFetchCacheLike } from "./bounded-image-fetch-cache.js";
import {
  ImagePolicyBlockedError,
  __resetImageFetchCacheForTesting,
  resolveImages,
} from "./image-resolver.js";

const stubNode = { type: "container" } as unknown as Node;
const stubImages = [
  { data: new ArrayBuffer(1), src: "https://example.com/a.png" },
];
const allowTrustedExampleCom = (url: string) =>
  url.startsWith("https://trusted.example.com/");

/**
 * Matches the shape `resolveImages` actually calls `prepareImages` with --
 * enough for these tests to assert against without importing the real
 * (much larger) `PrepareImagesOptions` type. `fetch` mirrors
 * `@takumi-rs/helpers`'s narrower `FetchLike` (not `typeof globalThis.fetch`,
 * which additionally requires a `preconnect` static -- a mock function
 * doesn't have one, and `resolveImages` only ever needs the call
 * signature).
 */
interface PrepareImagesCallArgs {
  allowUrl?: (url: string) => boolean;
  fetch?: (input: string, init?: RequestInit) => Promise<Response>;
  fetchCache?: ImageFetchCacheLike;
  maxBytes?: number;
  node: Node | Node[];
  timeout?: number;
}

describe("resolveImages", () => {
  beforeEach(() => {
    __resetImageFetchCacheForTesting();
  });

  it("defaults allowUrl to deny-all when no policy is configured", async () => {
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve(stubImages)
    );

    await resolveImages(stubNode, undefined, {
      prepareImages: prepareImagesMock,
    });

    const call = prepareImagesMock.mock.calls[0]?.[0];
    expect(call?.allowUrl?.("https://example.com/x.png")).toBe(false);
  });

  it("passes through an explicit allowUrl policy", async () => {
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve(stubImages)
    );
    await resolveImages(
      stubNode,
      { allowUrl: allowTrustedExampleCom },
      { prepareImages: prepareImagesMock }
    );

    const call = prepareImagesMock.mock.calls[0]?.[0];
    expect(call?.allowUrl?.("https://trusted.example.com/a.png")).toBe(true);
    expect(call?.allowUrl?.("https://evil.example.com/a.png")).toBe(false);
  });

  it("forwards maxBytes, timeout, and fetch to prepareImages", async () => {
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve(stubImages)
    );
    const customFetch = mock(() =>
      Promise.reject(new Error("unused"))
    ) as unknown as typeof globalThis.fetch;

    await resolveImages(
      stubNode,
      { fetch: customFetch, maxBytes: 1024, timeout: 2000 },
      { prepareImages: prepareImagesMock }
    );

    const call = prepareImagesMock.mock.calls[0]?.[0];
    expect(call?.maxBytes).toBe(1024);
    expect(call?.timeout).toBe(2000);
    expect(call?.fetch).toBe(customFetch);
  });

  it("does not extract emoji when policy.emoji is unset", async () => {
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve([])
    );
    const extractEmojisMock = mock((node: Node) => node);

    const result = await resolveImages(stubNode, undefined, {
      extractEmojis: extractEmojisMock,
      prepareImages: prepareImagesMock,
    });

    expect(extractEmojisMock).toHaveBeenCalledTimes(0);
    expect(result.node).toBe(stubNode);
  });

  it("does not extract emoji when policy.emoji is 'from-font'", async () => {
    const prepareImagesMock = mock(() => Promise.resolve([]));
    const extractEmojisMock = mock((node: Node) => node);

    const result = await resolveImages(
      stubNode,
      { emoji: "from-font" },
      { extractEmojis: extractEmojisMock, prepareImages: prepareImagesMock }
    );

    expect(extractEmojisMock).toHaveBeenCalledTimes(0);
    expect(result.node).toBe(stubNode);
  });

  it("extracts emoji before preparing images when a real provider is configured", async () => {
    const extractedNode = {
      marker: "extracted",
      type: "container",
    } as unknown as Node;
    const extractEmojisMock = mock(() => extractedNode);
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve([])
    );

    const result = await resolveImages(
      stubNode,
      { emoji: "twemoji" },
      { extractEmojis: extractEmojisMock, prepareImages: prepareImagesMock }
    );

    expect(extractEmojisMock).toHaveBeenCalledWith(stubNode, "twemoji");
    expect(result.node).toBe(extractedNode);
    // The extracted (post-emoji) node -- not the original -- must be what
    // gets walked for image URLs, since emoji glyphs become image nodes.
    expect(prepareImagesMock.mock.calls[0]?.[0]?.node).toBe(extractedNode);
  });

  it("returns the images prepareImages resolves", async () => {
    const prepareImagesMock = mock(() => Promise.resolve(stubImages));

    const result = await resolveImages(stubNode, undefined, {
      prepareImages: prepareImagesMock,
    });

    expect(result.images).toEqual(stubImages);
  });

  it("rewraps an allowUrl-blocked failure as ImagePolicyBlockedError", async () => {
    const prepareImagesMock = mock(() =>
      Promise.reject(
        new Error(
          "URL blocked by allowUrl policy: https://blocked.example.com/a.png"
        )
      )
    );

    const promise = resolveImages(
      stubNode,
      { allowUrl: () => false },
      {
        prepareImages: prepareImagesMock,
      }
    );

    await expect(promise).rejects.toBeInstanceOf(ImagePolicyBlockedError);
    try {
      await promise;
      throw new Error("expected resolveImages to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(ImagePolicyBlockedError);
      expect((error as ImagePolicyBlockedError).url).toBe(
        "https://blocked.example.com/a.png"
      );
    }
  });

  it("passes through non-policy fetch failures unchanged", async () => {
    const networkError = new TypeError("fetch failed");
    const prepareImagesMock = mock(() => Promise.reject(networkError));

    const promise = resolveImages(stubNode, undefined, {
      prepareImages: prepareImagesMock,
    });

    await expect(promise).rejects.toBe(networkError);
  });

  it("uses one shared fetch cache across calls by default", async () => {
    const seenCaches: unknown[] = [];
    const prepareImagesMock = mock((options: { fetchCache?: unknown }) => {
      seenCaches.push(options.fetchCache);
      return Promise.resolve([]);
    });

    await resolveImages(stubNode, undefined, {
      prepareImages: prepareImagesMock,
    });
    await resolveImages(stubNode, undefined, {
      prepareImages: prepareImagesMock,
    });

    expect(seenCaches[0]).toBeInstanceOf(BoundedImageFetchCache);
    expect(seenCaches[0]).toBe(seenCaches[1]);
  });

  it("uses an injected fetchCache instead of the shared one when provided", async () => {
    const customCache = new BoundedImageFetchCache(10);
    const prepareImagesMock = mock((_options: PrepareImagesCallArgs) =>
      Promise.resolve([])
    );

    await resolveImages(stubNode, undefined, {
      fetchCache: customCache,
      prepareImages: prepareImagesMock,
    });

    expect(prepareImagesMock.mock.calls[0]?.[0]?.fetchCache).toBe(customCache);
  });
});

describe("BoundedImageFetchCache", () => {
  it("evicts the least-recently-used entry once over capacity", () => {
    const cache = new BoundedImageFetchCache(2);
    const a = Promise.resolve(new ArrayBuffer(1));
    const b = Promise.resolve(new ArrayBuffer(1));
    const c = Promise.resolve(new ArrayBuffer(1));

    cache.set("a", a);
    cache.set("b", b);
    // Evicts "a" (oldest, never re-accessed).
    cache.set("c", c);

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(b);
    expect(cache.get("c")).toBe(c);
    expect(cache.size).toBe(2);
  });

  it("promotes a key to most-recently-used on get, sparing it from eviction", () => {
    const cache = new BoundedImageFetchCache(2);
    const a = Promise.resolve(new ArrayBuffer(1));
    const b = Promise.resolve(new ArrayBuffer(1));
    const c = Promise.resolve(new ArrayBuffer(1));

    cache.set("a", a);
    cache.set("b", b);
    // Promotes "a"; "b" is now the oldest.
    cache.get("a");
    // Evicts "b", not "a".
    cache.set("c", c);

    expect(cache.get("a")).toBe(a);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(c);
  });

  it("delete removes an entry", () => {
    const cache = new BoundedImageFetchCache(2);
    cache.set("a", Promise.resolve(new ArrayBuffer(1)));
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});
