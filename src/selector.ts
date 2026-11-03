import { domAdapter } from "./adapters/dom.ts";
import { domhandlerAdapter } from "./adapters/domhandler.ts";
import { resolveOptions } from "./config.ts";
import { createContext } from "./context.ts";
import { InvalidOptionError } from "./errors.ts";
import type {
  Adapter,
  AdapterName,
  SelectorContext,
  SelectorContextOptions,
  XPathOptions,
} from "./types.ts";

const ADAPTERS: Record<AdapterName, Adapter<object>> = {
  dom: domAdapter as Adapter<object>,
  domhandler: domhandlerAdapter as Adapter<object>,
};

const REQUIRED = ["isElement", "tagName", "parent", "children", "id", "classes", "allElements"];

function resolveAdapter(adapter: unknown, needsAttributes: boolean): Adapter<object> {
  if (typeof adapter === "string") {
    // Object.hasOwn is missing in the older browsers the injected page script targets.
    // biome-ignore lint/suspicious/noPrototypeBuiltins: see above
    if (Object.prototype.hasOwnProperty.call(ADAPTERS, adapter)) {
      return ADAPTERS[adapter as AdapterName];
    }
    throw new InvalidOptionError(
      `Unknown adapter: ${adapter} (use "dom", "domhandler" or an adapter object)`,
    );
  }
  if (!adapter || typeof adapter !== "object") {
    throw new InvalidOptionError(
      `Unknown adapter: ${String(adapter)} (use "dom", "domhandler" or an adapter object)`,
    );
  }
  const record = adapter as Record<string, unknown>;
  const required = needsAttributes ? [...REQUIRED, "attribute", "withAttribute"] : REQUIRED;
  const missing = required.filter((key) => typeof record[key] !== "function");
  if (missing.length > 0) {
    throw new InvalidOptionError(
      `Adapter is missing method(s): ${missing.join(", ")}${needsAttributes ? " (required by the attributes option)" : ""}`,
    );
  }
  return adapter as Adapter<object>;
}

/**
 * Creates a memoised selector context. Use one context per document: it caches sibling positions,
 * ancestor prefixes and id uniqueness, so selectors for many elements stay linear in page size.
 * Do not reuse a context after the document has been mutated.
 */
export function createSelectorContext<TNode = unknown>(
  options: SelectorContextOptions<TNode> = {},
): SelectorContext {
  const { adapter = "dom", ...rest } = options ?? {};
  const resolved = resolveOptions(rest);
  return createContext(resolveAdapter(adapter, resolved.attributes.length > 0), resolved);
}

/** One-off helper; prefer `createSelectorContext` when handling more than a few elements. */
export function cssSelectorOf<TNode = unknown>(
  node: unknown,
  options?: SelectorContextOptions<TNode>,
): string {
  return createSelectorContext(options).cssSelectorOf(node);
}

/** One-off helper; prefer `createSelectorContext` when handling more than a few elements. */
export function xpathOf<TNode = unknown>(
  node: unknown,
  options?: SelectorContextOptions<TNode> & XPathOptions,
): string {
  return createSelectorContext(options).xpathOf(node, options);
}
