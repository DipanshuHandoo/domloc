/** A class or id pattern. Strings are compiled with `new RegExp(pattern)` (no flags). */
export type Pattern = RegExp | string;

/**
 * Bridges the selector algorithm to a tree implementation. Methods only ever receive nodes for
 * which `isElement` returned true, and `parent`/`children` must only return elements.
 */
export interface Adapter<TNode = unknown> {
  isElement(node: unknown): node is TNode;
  /** Lower-case tag name, used for XPath steps and sibling grouping. */
  tagName(node: TNode): string;
  /**
   * Tag name as written in a CSS type selector (before escaping). Defaults to `tagName`. Also the
   * key for grouping siblings, so it must preserve case where the document is case-sensitive.
   */
  selectorName?(node: TNode): string;
  parent(node: TNode): TNode | null;
  children(node: TNode): ArrayLike<TNode>;
  /** The `id` attribute, or an empty string. */
  id(node: TNode): string;
  /** Class tokens in source order. */
  classes(node: TNode): readonly string[];
  /** Every element that carries an `id` in the same document (or tree) as `node`. */
  allElements(node: TNode): ArrayLike<TNode>;
  /** Attribute value, or an empty string. Required when the `attributes` option is used. */
  attribute?(node: TNode, name: string): string;
  /** Every element carrying attribute `name` in the same document. Required with `attributes`. */
  withAttribute?(node: TNode, name: string): ArrayLike<TNode>;
  /**
   * True when `node`'s document is in quirks mode, where browsers match class and id selectors
   * case-insensitively. domloc then treats classes and ids that differ only in case as equal.
   */
  quirksMode?(node: TNode): boolean;
  /**
   * Namespace URI of `node`: a string, `null` for no namespace, or `undefined` when the tree
   * does not record namespaces. Lets XPath steps address SVG, MathML and namespaced XML.
   */
  namespace?(node: TNode): string | null | undefined;
}

export type AdapterName = "dom" | "domhandler";

export interface SelectorOptions {
  /**
   * A node's first class is skipped when it matches any of these patterns.
   * Default: `DEFAULT_CLASS_DENY_LIST`. Pass `[]` to allow every class.
   */
  classDenyList?: readonly Pattern[];
  /** Ids matching this pattern never anchor a selector. Default: `DEFAULT_ID_DENY_PATTERN`. */
  idDenyPattern?: Pattern;
  /**
   * Attribute names (for example `data-testid`) whose document-unique values anchor a selector
   * as `[name="value"]`. Checked in order, before the id. Default: none.
   */
  attributes?: readonly string[];
}

export interface SelectorContextOptions<TNode = unknown> extends SelectorOptions {
  /** `"dom"` (browser, jsdom; default), `"domhandler"` (Cheerio) or a custom adapter. */
  adapter?: AdapterName | Adapter<TNode>;
}

export interface XPathOptions {
  /** Drop every `[1]` predicate (legacy fragment format). Default false. */
  omitFirstIndex?: boolean;
}

export interface SelectorContext {
  /** Readable, unique CSS selector, or `''` for anything that is not an element. */
  cssSelectorOf(node: unknown): string;
  /** Absolute positional XPath such as `/html/body[1]/main[1]/a[2]`, or `''` for non-elements. */
  xpathOf(node: unknown, options?: XPathOptions): string;
}

/** Options bundle that can be spread into `createSelectorContext`. */
export interface Preset {
  readonly classDenyList: readonly RegExp[];
  readonly idDenyPattern: RegExp;
}
