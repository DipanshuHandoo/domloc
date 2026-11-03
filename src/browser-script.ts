import { DomlocError } from "./errors.ts";

// Replaced at build time with the minified browser bundle (see scripts/build.mjs). Tests that run
// the TypeScript sources provide it on globalThis instead.
declare const __DOMLOC_BROWSER_SCRIPT__: string | undefined;

/**
 * Source of a script that defines `window.domloc` (the full API minus `getBrowserScript`) when
 * evaluated in a page. Idempotent: evaluating it again keeps the existing global.
 * Options passed to `window.domloc.createSelectorContext` from Node must be serialisable,
 * so pass patterns as strings or use `window.domloc.presets` inside the page.
 */
export function getBrowserScript(): string {
  if (typeof __DOMLOC_BROWSER_SCRIPT__ !== "string" || __DOMLOC_BROWSER_SCRIPT__ === "") {
    throw new DomlocError(
      "ERR_BROWSER_SCRIPT_UNAVAILABLE",
      "The browser script is only available in the built package (dist).",
    );
  }
  return __DOMLOC_BROWSER_SCRIPT__;
}
