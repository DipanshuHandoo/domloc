import type { Adapter } from "../types.ts";

/** The subset of a domhandler node (Cheerio, htmlparser2, parse5) that the adapter reads. */
export interface DomhandlerNodeLike {
  type: string;
  name?: string;
  parent?: DomhandlerNodeLike | null;
  children?: DomhandlerNodeLike[];
  attribs?: Record<string, string | undefined>;
  /** Set by parse5 (Cheerio's HTML parser); absent in htmlparser2 trees. */
  namespace?: string;
  /** Set on parse5 documents: "no-quirks", "limited-quirks" or "quirks". */
  "x-mode"?: string;
}

const ELEMENT_TYPES = new Set(["tag", "script", "style"]);

const isElement = (n: unknown): n is DomhandlerNodeLike =>
  !!n && ELEMENT_TYPES.has((n as { type?: string }).type as string);
// Class tokens are separated by ASCII whitespace only; `\s` would also split on U+00A0 etc.
const splitClasses = (value: string | undefined) =>
  (value ?? "").split(/[ \t\n\f\r]+/).filter(Boolean);
const attr = (n: DomhandlerNodeLike, name: string) => n.attribs?.[name] || "";

function rootOf(n: DomhandlerNodeLike): DomhandlerNodeLike {
  let top = n;
  while (top.parent) top = top.parent;
  return top;
}

/** Iterative so very deep documents cannot overflow the call stack. */
function collect(root: DomhandlerNodeLike, name: string): DomhandlerNodeLike[] {
  const out: DomhandlerNodeLike[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop() as DomhandlerNodeLike;
    if (isElement(node) && attr(node, name)) out.push(node);
    const kids = node.children ?? [];
    for (let i = kids.length - 1; i >= 0; i -= 1) stack.push(kids[i] as DomhandlerNodeLike);
  }
  return out;
}

/** Cheerio / domhandler nodes (htmlparser2 or parse5 trees). */
export const domhandlerAdapter: Adapter<DomhandlerNodeLike> = Object.freeze({
  isElement,
  tagName: (n: DomhandlerNodeLike) => (n.name || "").toLowerCase(),
  // Parsers already lower-case HTML names; SVG names (foreignObject) and XML keep their case.
  selectorName: (n: DomhandlerNodeLike) => n.name || "",
  parent: (n: DomhandlerNodeLike) => (n.parent && isElement(n.parent) ? n.parent : null),
  children: (n: DomhandlerNodeLike) => (n.children ?? []).filter(isElement),
  id: (n: DomhandlerNodeLike) => attr(n, "id"),
  classes: (n: DomhandlerNodeLike) => splitClasses(n.attribs?.class),
  allElements: (n: DomhandlerNodeLike) => collect(rootOf(n), "id"),
  attribute: attr,
  withAttribute: (n: DomhandlerNodeLike, name: string) => collect(rootOf(n), name),
  quirksMode: (n: DomhandlerNodeLike) => rootOf(n)["x-mode"] === "quirks",
  namespace: (n: DomhandlerNodeLike) => n.namespace,
});
