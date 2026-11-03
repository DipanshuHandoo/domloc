import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cheerio from "cheerio";
import {
  type Adapter,
  createSelectorContext,
  domAdapter,
  domhandlerAdapter,
} from "../src/index.ts";
import { allElements, evaluateXPath, makeDom } from "./helpers.ts";

const assertRoundTrip = (doc: Document, ctx = createSelectorContext()) => {
  for (const el of allElements(doc)) {
    const selector = ctx.cssSelectorOf(el);
    const matches = doc.querySelectorAll(selector);
    assert.equal(matches.length, 1, selector);
    assert.equal(matches[0], el, selector);
  }
};

describe("DOM edge cases", () => {
  it("handles SVG and MathML elements, preserving case-sensitive tag names", () => {
    const doc = makeDom(`<body>
      <svg><defs><linearGradient id="g1"></linearGradient><linearGradient></linearGradient></defs>
      <foreignObject><p>in svg</p></foreignObject><foreignObject></foreignObject><circle class="dot"></circle></svg>
      <math><mi>x</mi><mi>y</mi></math></body>`);
    const ctx = createSelectorContext();
    assertRoundTrip(doc, ctx);
    const fo = doc.querySelector("p")?.parentElement as Element;
    assert.equal(ctx.cssSelectorOf(fo), "body > svg > foreignObject:nth-of-type(1)");
    // Non-HTML elements need local-name(.) to resolve in HTML documents.
    assert.equal(
      ctx.xpathOf(fo),
      "/html/body[1]/*[local-name(.)='svg'][1]/*[local-name(.)='foreignObject'][1]",
    );
    assert.equal(evaluateXPath(doc, ctx.xpathOf(fo)), fo);
  });

  it("handles custom elements", () => {
    const doc = makeDom(
      "<body><my-card><x-a></x-a><x-a></x-a></my-card><my-card class='promo'></my-card></body>",
    );
    assertRoundTrip(doc);
    assert.equal(
      createSelectorContext().cssSelectorOf(doc.querySelector(".promo")),
      "body > my-card.promo",
    );
  });

  it("escapes awkward ids and classes", () => {
    const doc = makeDom(`<body>
      <div id="a.b:c"><span class="x.y"></span><span class="x:y"></span></div>
      <div id="ünï-côdé"><i class="✓ ok"></i><i class="1st"></i></div>
      <div id="sp ace"></div><div id="-dash"><b class="--var"></b></div></body>`);
    assertRoundTrip(doc);
  });

  it("copes with huge class lists and deep trees", () => {
    const classes = Array.from({ length: 500 }, (_v, i) => `c${i}`).join(" ");
    let html = "<body>";
    for (let i = 0; i < 150; i += 1) html += `<div class="${classes}">`;
    html += "<a>deep</a>";
    for (let i = 0; i < 150; i += 1) html += "</div>";
    const doc = makeDom(`${html}</body>`);
    const ctx = createSelectorContext();
    const a = doc.querySelector("a") as Element;
    assert.equal(doc.querySelector(ctx.cssSelectorOf(a)), a);
    assert.equal(evaluateXPath(doc, ctx.xpathOf(a)), a);
  });

  it("does not anchor on any duplicate id", () => {
    const doc = makeDom(
      '<body><p id="x"><a></a></p><p id="x"><a></a></p><p id="y"><a></a></p></body>',
    );
    assertRoundTrip(doc);
    const ctx = createSelectorContext();
    const links = Array.from(doc.querySelectorAll("a")).map((a) => ctx.cssSelectorOf(a));
    assert.deepEqual(links, [
      "body > p:nth-of-type(1) > a",
      "body > p:nth-of-type(2) > a",
      "#y > a",
    ]);
  });

  it("produces relative paths for detached nodes and fragments", () => {
    const doc = makeDom("<body></body>");
    const root = doc.createElement("section");
    root.innerHTML = '<div id="solo"><a></a></div><p></p><p class="k"></p>';
    const ctx = createSelectorContext();
    // Detached ids are not in the document, so they never anchor.
    assert.equal(ctx.cssSelectorOf(root.querySelector("a")), "section > div > a");
    assert.equal(ctx.xpathOf(root.querySelector(".k")), "/section[1]/p[2]");

    const fragment = doc.createDocumentFragment();
    const li = doc.createElement("li");
    fragment.append(li, doc.createElement("li"));
    assert.equal(ctx.cssSelectorOf(li), "li");
    assert.equal(ctx.xpathOf(li), "/li[1]");
  });

  it("treats <template> content as a detached fragment", () => {
    const doc = makeDom("<body><template><div><span></span></div></template></body>");
    const template = doc.querySelector("template") as HTMLTemplateElement;
    const span = template.content.querySelector("span");
    const ctx = createSelectorContext();
    assert.equal(ctx.cssSelectorOf(span), "div > span");
    assert.equal(ctx.cssSelectorOf(template), "body > template");
  });

  it("stops at a shadow root (selectors are relative to it)", () => {
    const doc = makeDom('<body><div id="host"></div></body>');
    const host = doc.querySelector("#host") as Element;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<p><b></b></p>";
    const b = shadow.querySelector("b");
    const selector = createSelectorContext().cssSelectorOf(b);
    assert.equal(selector, "p > b");
    assert.equal(shadow.querySelector(selector), b);
  });
});

describe("Cheerio (domhandler) edge cases", () => {
  it("returns '' for the root document, text and comment nodes", () => {
    const $ = cheerio.load("<p>text<!-- c --></p>");
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const p = $("p")[0] as unknown as { children: unknown[] };
    assert.equal(ctx.cssSelectorOf($.root()[0]), "");
    assert.equal(ctx.cssSelectorOf(p.children[0]), "");
    assert.equal(ctx.cssSelectorOf(p.children[1]), "");
    assert.equal(ctx.xpathOf($.root()[0]), "");
  });

  it("treats <script> and <style> as elements", () => {
    const html =
      "<html><head><style>a{}</style><script>1</script><script>2</script></head><body></body></html>";
    const $ = cheerio.load(html);
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const scripts = $("script").toArray();
    assert.equal(ctx.cssSelectorOf(scripts[1]), "head > script:nth-of-type(2)");
    assert.equal(ctx.xpathOf(scripts[1]), "/html/head[1]/script[2]");
    assert.equal(ctx.cssSelectorOf($("style")[0]), "head > style");
    for (const el of $("*").toArray()) assert.equal($(ctx.cssSelectorOf(el))[0], el);
  });

  it("works for nodes from selections and .children()", () => {
    const $ = cheerio.load('<ul id="list"><li>a</li><li class="b">b</li></ul>');
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const kids = $("#list").children().toArray();
    assert.deepEqual(
      kids.map((k) => ctx.cssSelectorOf(k)),
      ["#list > li:nth-of-type(1)", "#list > li.b"],
    );
  });

  it("preserves SVG tag case so selectors resolve in browsers", () => {
    const html =
      "<body><svg><foreignObject><p>x</p></foreignObject><foreignObject></foreignObject></svg></body>";
    const $ = cheerio.load(html);
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const selector = ctx.cssSelectorOf($("p").parent()[0]);
    assert.equal(selector, "body > svg > foreignObject:nth-of-type(1)");
    // css-select (Cheerio) cannot match camel-cased SVG names in HTML mode at all; browsers can.
    const doc = makeDom(html);
    assert.equal(doc.querySelector(selector), doc.querySelector("p")?.parentElement);
  });

  it("supports XML documents (case-sensitive names)", () => {
    const xml =
      '<feed><Entry id="e1"><Title>a</Title></Entry><Entry><Title>b</Title></Entry></feed>';
    const $ = cheerio.load(xml, { xml: true });
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const titles = $("Title").toArray();
    const selectors = titles.map((t) => ctx.cssSelectorOf(t));
    assert.deepEqual(selectors, ["#e1 > Title", "feed > Entry:nth-of-type(2) > Title"]);
    for (const [i, s] of selectors.entries()) assert.equal($(s)[0], titles[i]);
    assert.equal(ctx.xpathOf(titles[1]), "/feed[1]/Entry[2]/Title[1]");
  });

  it("handles htmlparser2 trees without an html root", () => {
    const $ = cheerio.load("<div><span></span><span></span></div>", null, false);
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const span = $("span")[1];
    assert.equal(ctx.cssSelectorOf(span), "div > span:nth-of-type(2)");
    assert.equal(ctx.xpathOf(span), "/div[1]/span[2]");
    assert.equal($(ctx.cssSelectorOf(span))[0], span);
  });
});

describe("custom adapters", () => {
  interface TreeNode {
    tag: string;
    id?: string;
    cls?: string[];
    data?: Record<string, string>;
    parent: TreeNode | null;
    kids: TreeNode[];
  }

  const node = (tag: string, props: Partial<TreeNode> = {}, kids: TreeNode[] = []): TreeNode => {
    const n: TreeNode = { tag, parent: null, ...props, kids };
    for (const k of kids) k.parent = n;
    return n;
  };
  const walk = (n: TreeNode): TreeNode[] => [n, ...n.kids.flatMap(walk)];
  const top = (n: TreeNode): TreeNode => (n.parent ? top(n.parent) : n);

  const treeAdapter: Adapter<TreeNode> = {
    isElement: (n: unknown): n is TreeNode => !!n && typeof (n as TreeNode).tag === "string",
    tagName: (n) => n.tag,
    parent: (n) => n.parent,
    children: (n) => n.kids,
    id: (n) => n.id ?? "",
    classes: (n) => n.cls ?? [],
    allElements: (n) => walk(top(n)).filter((x) => x.id),
    attribute: (n, name) => n.data?.[name] ?? "",
    withAttribute: (n, name) => walk(top(n)).filter((x) => x.data?.[name]),
  };

  it("drives the same algorithm through any tree", () => {
    const leaf = node("leaf", { data: { key: "k1" } });
    const tree = node("html", {}, [
      node("body", {}, [
        node("box", { cls: ["a"] }),
        node("box", { id: "main" }, [node("item"), leaf]),
      ]),
    ]);
    const ctx = createSelectorContext({ adapter: treeAdapter });
    assert.equal(ctx.cssSelectorOf(leaf), "#main > leaf");
    assert.equal(ctx.xpathOf(leaf), "/html/body[1]/box[2]/leaf[1]");
    assert.equal(ctx.cssSelectorOf(tree.kids[0]?.kids[0]), "body > box.a");
    const keyed = createSelectorContext({ adapter: treeAdapter, attributes: ["key"] });
    assert.equal(keyed.cssSelectorOf(leaf), '[key="k1"]');
  });

  it("can wrap a built-in adapter", () => {
    const doc = makeDom('<body><div id="app"><a></a></div></body>');
    const noIds = { ...domAdapter, id: () => "" };
    assert.equal(
      createSelectorContext({ adapter: noIds }).cssSelectorOf(doc.querySelector("a")),
      "body > div > a",
    );
    assert.equal(typeof domhandlerAdapter.isElement, "function");
    assert.ok(Object.isFrozen(domAdapter) && Object.isFrozen(domhandlerAdapter));
  });
});
