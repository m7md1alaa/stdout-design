import { mock } from "bun:test";

/**
 * `bun:test`'s `mock.module()` replaces a single, process-wide registry entry.
 * `@takumi-rs/helpers` consumers (`image-resolver.ts`, `assets-resolver.ts`,
 * `font-config.ts`) bind to whichever mock is active the first time they're
 * evaluated — a later `mock.module()` call from a different test file can't
 * rebind an already-linked import. Every test file that mocks this module
 * must reuse these shared mock functions so `.mockImplementationOnce()` /
 * `.mock.calls` inspection works no matter which file's import triggers the
 * first (and only) evaluation.
 */
export const prepareImagesMock = mock(
  (_options: { allowUrl?: (url: string) => boolean }) =>
    Promise.resolve<unknown[]>([])
);

export const googleFontsMock = mock(() => Promise.resolve<unknown[]>([]));
