# Adapters

An adapter tells domloc how to read a tree. Two are built in and exported:

| Name              | Export              | Works with                                                  |
| ----------------- | ------------------- | ----------------------------------------------------------- |
| `"dom"` (default) | `domAdapter`        | Browser DOM, Playwright/Puppeteer page context, jsdom       |
| `"domhandler"`    | `domhandlerAdapter` | Cheerio, htmlparser2 and parse5 trees built with domhandler |

Both are frozen. Wrap them with object spread to change one behaviour.

## Contract

```ts
interface Adapter<TNode> {
  isElement(node: unknown): node is TNode;
  tagName(node: TNode): string; // lower-case; used for XPath steps
  selectorName?(node: TNode): string; // name for CSS and sibling grouping; defaults to tagName
  parent(node: TNode): TNode | null; // parent element, or null at the root
  children(node: TNode): ArrayLike<TNode>; // child elements only, in document order
  id(node: TNode): string; // '' when absent
  classes(node: TNode): readonly string[]; // class tokens in source order
  allElements(node: TNode): ArrayLike<TNode>; // every element with an id in node's document
  attribute?(node: TNode, name: string): string; // needed for the attributes option
  withAttribute?(node: TNode, name: string): ArrayLike<TNode>; // likewise
  quirksMode?(node: TNode): boolean; // true for quirks-mode documents
  namespace?(node: TNode): string | null | undefined; // namespace URI; undefined if unknown
}
```

Rules:

- Methods other than `isElement` only receive nodes for which `isElement` returned `true`.
- `parent` and `children` must return elements only, never text or comment nodes.
- `allElements` and `withAttribute` define the uniqueness scope for ids and attributes. Return
  elements from the whole document, not just the subtree.
- `selectorName` returns the raw name (domloc escapes it). It must preserve case wherever the
  document is case-sensitive, because siblings are grouped by it for `:nth-of-type`.
- `quirksMode` is asked once per context. When it returns `true`, classes and ids that differ
  only in case count as equal.
- `namespace` lets XPath steps address SVG, MathML and namespaced XML. Without it, steps use the
  element name, which in HTML documents only resolves for HTML elements.
- Methods are called with the adapter as `this`.
- Missing required methods throw `InvalidOptionError` when the context is created. Missing
  `attribute` or `withAttribute` throw only if `attributes` is set.

## Example: wrap a built-in adapter

```js
import { createSelectorContext, domAdapter } from "@dipanshuhandoo/domloc";

// Ignore ids completely, for example when ids are regenerated on every deploy.
const positional = createSelectorContext({ adapter: { ...domAdapter, id: () => "" } });
```

## Example: a custom tree

See [examples/custom-adapter.mjs](https://github.com/DipanshuHandoo/domloc/blob/main/examples/custom-adapter.mjs)
for a complete adapter over a plain JSON tree.

## TypeScript

`Adapter<TNode>` is generic. The built-in adapters use structural types (`DomElementLike`,
`DomhandlerNodeLike`), so the package's types do not depend on `lib.dom` or `domhandler`.
