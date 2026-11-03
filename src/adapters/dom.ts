import { cssEscape } from "../escape.ts";
import type { Adapter } from "../types.ts";

/** The subset of a DOM `Element` that the DOM adapter reads. Real `Element`s satisfy it. */
export interface DomElementLike {
  nodeType: number;
  nodeName: string;
  localName?: string;
  namespaceURI?: string | null;
  parentElement: DomElementLike | null;
  children: ArrayLike<DomElementLike>;
  ownerDocument: {
    querySelectorAll(selector: string): ArrayLike<DomElementLike>;
    compatMode?: string;
  } | null;
  getAttribute(name: string): string | null;
}

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
// Class tokens are separated by ASCII whitespace only; `\s` would also split on U+00A0 etc.
const splitClasses = (value: string | null) => (value ?? "").split(/[ \t\n\f\r]+/).filter(Boolean);
const scopeOf = (n: DomElementLike) =>
  n.ownerDocument ?? (n as unknown as NonNullable<DomElementLike["ownerDocument"]>);

/** Browser DOM, Playwright/Puppeteer page context and jsdom. */
export const domAdapter: Adapter<DomElementLike> = Object.freeze({
  isElement: (n: unknown): n is DomElementLike =>
    !!n && (n as { nodeType?: unknown }).nodeType === 1,
  tagName: (n: DomElementLike) => (n.nodeName || "").toLowerCase(),
  // HTML elements match case-insensitively; SVG, MathML and XML elements need their exact name.
  selectorName: (n: DomElementLike) =>
    n.namespaceURI !== HTML_NAMESPACE && n.localName
      ? n.localName
      : (n.nodeName || "").toLowerCase(),
  parent: (n: DomElementLike) => n.parentElement || null,
  children: (n: DomElementLike) => Array.prototype.slice.call(n.children) as DomElementLike[],
  id: (n: DomElementLike) => n.getAttribute("id") || "",
  classes: (n: DomElementLike) => splitClasses(n.getAttribute("class")),
  allElements: (n: DomElementLike) => scopeOf(n).querySelectorAll("[id]"),
  attribute: (n: DomElementLike, name: string) => n.getAttribute(name) || "",
  withAttribute: (n: DomElementLike, name: string) =>
    scopeOf(n).querySelectorAll(`[${cssEscape(name)}]`),
  quirksMode: (n: DomElementLike) => n.ownerDocument?.compatMode === "BackCompat",
  namespace: (n: DomElementLike) => n.namespaceURI,
});
