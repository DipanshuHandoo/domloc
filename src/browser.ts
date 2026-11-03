// Entry for the IIFE bundle (dist/browser) and the string returned by getBrowserScript().
import { domAdapter } from "./adapters/dom.ts";
import { domhandlerAdapter } from "./adapters/domhandler.ts";
import { DEFAULT_CLASS_DENY_LIST, DEFAULT_ID_DENY_PATTERN, presets } from "./config.ts";
import { DomlocError, InvalidOptionError, isDomlocError } from "./errors.ts";
import { cssEscape } from "./escape.ts";
import { createSelectorContext, cssSelectorOf, xpathOf } from "./selector.ts";

const scope = globalThis as { domloc?: unknown };
if (!scope.domloc) {
  scope.domloc = Object.freeze({
    createSelectorContext,
    cssSelectorOf,
    xpathOf,
    cssEscape,
    DEFAULT_CLASS_DENY_LIST,
    DEFAULT_ID_DENY_PATTERN,
    presets,
    domAdapter,
    domhandlerAdapter,
    DomlocError,
    InvalidOptionError,
    isDomlocError,
  });
}
