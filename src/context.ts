import type { ResolvedOptions } from "./config.ts";
import { cssEscape, cssString } from "./escape.ts";
import type { Adapter, SelectorContext, XPathOptions } from "./types.ts";

interface SiblingInfo<TNode> {
  index: number;
  group: TNode[];
}

// HTML attributes whose values selectors match ASCII case-insensitively (HTML §4.16.2).
const CASE_INSENSITIVE_ATTRIBUTES = new Set(
  "accept accept-charset align alink axis bgcolor charset checked clear codetype color compact declare defer dir direction disabled enctype face frame hreflang http-equiv lang language link media method multiple nohref noresize noshade nowrap readonly rel rev rules scope scrolling selected shape target text type valign valuetype vlink".split(
    " ",
  ),
);

const same = (value: string) => value;
const lower = (value: string) => value.toLowerCase();

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
// Names usable as an unprefixed XPath name test (an XML NCName, approximated).
const PLAIN_NAME = /^[\p{L}_][\p{L}\p{N}_.\-\u00B7]*$/u;

/** An XPath 1.0 string literal; XPath has no escapes, so mixed quotes need concat(). */
function xpathLiteral(value: string): string {
  if (!value.includes("'")) return `'${value}'`;
  if (!value.includes('"')) return `"${value}"`;
  return `concat('${value.split("'").join(`', "'", '`)}')`;
}

/**
 * The memoised algorithm. One context per document: sibling groups, ancestor prefixes and
 * document-wide id/attribute counts are computed once, so many lookups stay linear in page size.
 */
export function createContext<TNode extends object>(
  adapter: Adapter<TNode>,
  options: ResolvedOptions,
): SelectorContext {
  const { classDeny, idDeny, attributes } = options;
  const selectorName: (node: TNode) => string = (adapter.selectorName ?? adapter.tagName).bind(
    adapter,
  );
  const namespaceOf = adapter.namespace?.bind(adapter);

  const siblingInfo = new WeakMap<TNode, SiblingInfo<TNode>>();
  const groupClassCounts = new WeakMap<TNode[], Map<string, number>>();
  const anchors = new WeakMap<TNode, string | null>();
  const cssCache = new WeakMap<TNode, string>();
  const xpathCache = new WeakMap<TNode, string>();
  const xpathCacheOmit = new WeakMap<TNode, string>();
  let idCounts: Map<string, number> | null = null;
  const attributeCounts = new Map<string, Map<string, number>>();
  let nameKey: ((value: string) => string) | null = null;
  const escapedTags = new Map<string, string>();

  /** Classes and ids compare case-insensitively in quirks mode; decided once per document. */
  function namesKey(node: TNode): (value: string) => string {
    if (!nameKey) nameKey = adapter.quirksMode?.call(adapter, node) ? lower : same;
    return nameKey;
  }

  /** Index among same-name siblings and the sibling group, computed once per parent. */
  function infoFor(node: TNode): SiblingInfo<TNode> {
    const known = siblingInfo.get(node);
    if (known) return known;
    const parent = adapter.parent(node);
    if (!parent) {
      const solo = { index: 1, group: [node] };
      siblingInfo.set(node, solo);
      return solo;
    }
    const groups = new Map<string, TNode[]>();
    const kids = adapter.children(parent);
    for (let i = 0; i < kids.length; i += 1) {
      const kid = kids[i] as TNode;
      // :nth-of-type counts siblings with the same (case-sensitive, for XML) element name.
      const tag = selectorName(kid);
      let group = groups.get(tag);
      if (!group) {
        group = [];
        groups.set(tag, group);
      }
      group.push(kid);
      siblingInfo.set(kid, { index: group.length, group });
    }
    return siblingInfo.get(node) ?? { index: 1, group: [node] };
  }

  function classCountsOf(group: TNode[], key: (value: string) => string): Map<string, number> {
    let counts = groupClassCounts.get(group);
    if (counts) return counts;
    counts = new Map();
    for (const member of group) {
      const classes = adapter.classes(member);
      for (const cls of new Set(key === same ? classes : classes.map(key))) {
        counts.set(cls, (counts.get(cls) ?? 0) + 1);
      }
    }
    groupClassCounts.set(group, counts);
    return counts;
  }

  function countValues(
    nodes: ArrayLike<TNode>,
    read: (node: TNode) => string,
    key: (value: string) => string,
  ) {
    const counts = new Map<string, number>();
    for (let i = 0; i < nodes.length; i += 1) {
      const value = read(nodes[i] as TNode);
      if (value) {
        const k = key(value);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return counts;
  }

  function attributeAnchor(node: TNode): string | null {
    const read = (n: TNode, name: string) =>
      (adapter.attribute as NonNullable<Adapter<TNode>["attribute"]>).call(adapter, n, name);
    for (const name of attributes) {
      const value = read(node, name);
      if (!value) continue;
      const key = CASE_INSENSITIVE_ATTRIBUTES.has(name.toLowerCase()) ? lower : same;
      let counts = attributeCounts.get(name);
      if (!counts) {
        const nodes = (adapter.withAttribute as NonNullable<Adapter<TNode>["withAttribute"]>).call(
          adapter,
          node,
          name,
        );
        counts = countValues(nodes, (n) => read(n, name), key);
        attributeCounts.set(name, counts);
      }
      if (counts.get(key(value)) === 1) return `[${cssEscape(name)}=${cssString(value)}]`;
    }
    return null;
  }

  function idAnchor(node: TNode): string | null {
    const id = adapter.id(node);
    if (!id || idDeny.test(id)) return null;
    const key = namesKey(node);
    if (!idCounts) idCounts = countValues(adapter.allElements(node), (n) => adapter.id(n), key);
    return idCounts.get(key(id)) === 1 ? `#${cssEscape(id)}` : null;
  }

  function anchorOf(node: TNode): string | null {
    const cached = anchors.get(node);
    if (cached !== undefined) return cached;
    const anchor = (attributes.length > 0 ? attributeAnchor(node) : null) ?? idAnchor(node);
    anchors.set(node, anchor);
    return anchor;
  }

  /** Unique among its siblings: tag alone, `tag.class` (class unique in the group) or `:nth-of-type`. */
  function stepOf(node: TNode): string {
    const name = selectorName(node);
    let tag = escapedTags.get(name);
    if (tag === undefined) {
      tag = cssEscape(name);
      escapedTags.set(name, tag);
    }
    const { index, group } = infoFor(node);
    const first = adapter.classes(node)[0];
    if (first && !classDeny.some((re) => re.test(first))) {
      const key = namesKey(node);
      if (classCountsOf(group, key).get(key(first)) === 1) return `${tag}.${cssEscape(first)}`;
    }
    return group.length === 1 ? tag : `${tag}:nth-of-type(${index})`;
  }

  function cssSelectorOf(node: unknown): string {
    if (!node || !adapter.isElement(node)) return "";
    const path: TNode[] = [];
    let base = "";
    let cur: TNode | null = node;
    while (cur) {
      const cached = cssCache.get(cur);
      if (cached !== undefined) {
        base = cached;
        break;
      }
      path.push(cur);
      if (anchorOf(cur)) break;
      const parent: TNode | null = adapter.parent(cur);
      // Selectors start at body: `html >` adds nothing when html is the document root.
      cur = parent && adapter.tagName(parent) === "html" && !adapter.parent(parent) ? null : parent;
    }
    let acc = base;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const step = path[i] as TNode;
      const anchor = anchorOf(step);
      if (anchor) acc = anchor;
      else acc = acc ? `${acc} > ${stepOf(step)}` : stepOf(step);
      cssCache.set(step, acc);
    }
    return acc;
  }

  /**
   * The XPath name test for a step. Plain HTML keeps the legacy lower-case name; other names use
   * forms browsers can resolve in HTML documents.
   */
  function xpathNameOf(node: TNode, tag: string): string {
    const name = selectorName(node);
    const ns = namespaceOf?.(node);
    const prefixed = name.includes(":");
    // A real XML prefix: local-name() would drop it, so match the qualified name.
    if (prefixed && ns !== HTML_NAMESPACE) return `*[name(.)=${xpathLiteral(name)}]`;
    // HTML parsers keep "o:p" as the local name. In HTML documents an unprefixed name test only
    // matches HTML-namespace elements, so SVG/MathML need local-name() too.
    if (prefixed || !PLAIN_NAME.test(name) || (ns && ns !== HTML_NAMESPACE)) {
      return `*[local-name(.)=${xpathLiteral(name)}]`;
    }
    // Case-sensitive XML without namespace information.
    return name !== tag ? name : tag;
  }

  function xpathOf(node: unknown, xpathOptions?: XPathOptions): string {
    if (!node || !adapter.isElement(node)) return "";
    const omitFirst = !!xpathOptions?.omitFirstIndex;
    const cache = omitFirst ? xpathCacheOmit : xpathCache;
    const path: TNode[] = [];
    let base = "";
    let cur: TNode | null = node;
    while (cur) {
      const cached = cache.get(cur);
      if (cached !== undefined) {
        base = cached;
        break;
      }
      path.push(cur);
      cur = adapter.parent(cur);
    }
    let acc = base;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const step = path[i] as TNode;
      const tag = adapter.tagName(step);
      const { index } = infoFor(step);
      let segment: string;
      if (tag === "html") segment = tag;
      else {
        const name = xpathNameOf(step, tag);
        segment = omitFirst && index === 1 ? name : `${name}[${index}]`;
      }
      acc = `${acc}/${segment}`;
      cache.set(step, acc);
    }
    return acc;
  }

  return { cssSelectorOf, xpathOf };
}
