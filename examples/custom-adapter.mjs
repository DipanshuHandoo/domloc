// A custom adapter drives the same algorithm through any tree (here: a plain JSON tree).
import assert from "node:assert/strict";
import { createSelectorContext, domAdapter } from "@dipanshuhandoo/domloc";
import { JSDOM } from "jsdom";

const tree = {
  tag: "html",
  kids: [
    {
      tag: "body",
      kids: [
        {
          tag: "panel",
          id: "left",
          kids: [{ tag: "item" }, { tag: "item", attrs: { key: "k2" } }],
        },
        { tag: "panel", cls: ["wide"], kids: [{ tag: "item" }] },
      ],
    },
  ],
};
const link = (node, parent = null) => {
  node.parent = parent;
  for (const kid of node.kids ?? []) link(kid, node);
  return node;
};
link(tree);
const all = (node) => [node, ...(node.kids ?? []).flatMap(all)];
const top = (node) => (node.parent ? top(node.parent) : node);

/** @type {import("@dipanshuhandoo/domloc").Adapter<any>} */
const jsonAdapter = {
  isElement: (n) => !!n && typeof n.tag === "string",
  tagName: (n) => n.tag,
  parent: (n) => n.parent,
  children: (n) => n.kids ?? [],
  id: (n) => n.id ?? "",
  classes: (n) => n.cls ?? [],
  allElements: (n) => all(top(n)).filter((x) => x.id),
  // Only needed when the `attributes` option is used.
  attribute: (n, name) => n.attrs?.[name] ?? "",
  withAttribute: (n, name) => all(top(n)).filter((x) => x.attrs?.[name]),
};

const ctx = createSelectorContext({ adapter: jsonAdapter, attributes: ["key"] });
const [left, wide] = tree.kids[0].kids;
assert.equal(ctx.cssSelectorOf(left.kids[0]), "#left > item:nth-of-type(1)");
assert.equal(ctx.cssSelectorOf(left.kids[1]), '[key="k2"]');
assert.equal(ctx.cssSelectorOf(wide.kids[0]), "body > panel.wide > item");
assert.equal(ctx.xpathOf(wide.kids[0]), "/html/body[1]/panel[2]/item[1]");

// Wrapping a built-in adapter: ignore ids entirely so selectors never depend on them.
const { document } = new JSDOM('<body><div id="app"><a>x</a></div></body>').window;
const positional = createSelectorContext({ adapter: { ...domAdapter, id: () => "" } });
assert.equal(positional.cssSelectorOf(document.querySelector("a")), "body > div > a");
console.log("custom adapters ok");
