export type { DomElementLike } from "./adapters/dom.ts";
export { domAdapter } from "./adapters/dom.ts";
export type { DomhandlerNodeLike } from "./adapters/domhandler.ts";
export { domhandlerAdapter } from "./adapters/domhandler.ts";
export { getBrowserScript } from "./browser-script.ts";
export { DEFAULT_CLASS_DENY_LIST, DEFAULT_ID_DENY_PATTERN, presets } from "./config.ts";
export type { ErrorCode } from "./errors.ts";
export { DomlocError, InvalidOptionError, isDomlocError } from "./errors.ts";
export { cssEscape } from "./escape.ts";
export { createSelectorContext, cssSelectorOf, xpathOf } from "./selector.ts";
export type {
  Adapter,
  AdapterName,
  Pattern,
  Preset,
  SelectorContext,
  SelectorContextOptions,
  SelectorOptions,
  XPathOptions,
} from "./types.ts";
