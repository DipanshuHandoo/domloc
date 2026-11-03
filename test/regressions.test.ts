import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cheerio from "cheerio";
import { JSDOM } from "jsdom";
import { createSelectorContext } from "../src/index.ts";
import { evaluateXPath, makeDom } from "./helpers.ts";

type Root = { querySelectorAll(selector: string): ArrayLike<unknown> };

const assertResolves = (root: Root, selector: string, el: unknown) => {
  const matches = root.querySelectorAll(selector);
  assert.equal(matches.length, 1, selector);
  assert.equal(matches[0], el, selector);
};

const assertResolvesCheerio = ($: cheerio.CheerioAPI, selector: string, el: unknown) => {
  const matches = $(selector);
  assert.equal(matches.length, 1, selector);
  assert.equal(matches[0], el, selector);
};

describe("regressions: tag names", () => {
  it("escapes prefixed and unusual HTML tag names (Word <o:p>, <fb:like>, <x.y>)", () => {
    const html =
      '<!doctype html><body><p class="MsoNormal">a<o:p></o:p></p><p>b<fb:like></fb:like><fb:like></fb:like></p><x.y></x.y><x.y></x.y></body>';
    const doc = makeDom(html);
    const $ = cheerio.load(html);
    const dom = createSelectorContext();
    const ch = createSelectorContext({ adapter: "domhandler" });
    const chAll = $("*").toArray();
    Array.from(doc.querySelectorAll("*")).forEach((el, i) => {
      const selector = dom.cssSelectorOf(el);
      assertResolves(doc, selector, el);
      assert.equal(ch.cssSelectorOf(chAll[i]), selector);
    });
    assert.equal(
      dom.cssSelectorOf(doc.querySelector("p")?.lastElementChild),
      "body > p.MsoNormal > o\\:p",
    );
  });

  it("escapes prefixed XML tag names (Cheerio xml)", () => {
    const $ = cheerio.load("<r><ns:item/><ns:item/><other/></r>", { xml: true });
    const ctx = createSelectorContext({ adapter: "domhandler" });
    for (const el of $("*").toArray()) assertResolvesCheerio($, ctx.cssSelectorOf(el), el);
  });

  it("groups XML siblings by case-sensitive name", () => {
    const $ = cheerio.load("<r><Item/><item/><Item/></r>", { xml: true });
    const ctx = createSelectorContext({ adapter: "domhandler" });
    const kids = $("r").children().toArray();
    assert.deepEqual(
      kids.map((k) => ctx.cssSelectorOf(k)),
      ["r > Item:nth-of-type(1)", "r > item", "r > Item:nth-of-type(2)"],
    );
    for (const el of kids) assertResolvesCheerio($, ctx.cssSelectorOf(el), el);
  });

  it("keeps tag case in XML documents parsed by DOMParser", () => {
    const { DOMParser } = new JSDOM("").window;
    const doc = new DOMParser().parseFromString(
      "<feed><Entry><Title/></Entry><Entry><Title/></Entry></feed>",
      "application/xml",
    );
    const ctx = createSelectorContext();
    for (const el of Array.from(doc.querySelectorAll("*"))) {
      assertResolves(doc, ctx.cssSelectorOf(el), el);
    }
    assert.equal(
      ctx.cssSelectorOf(doc.querySelectorAll("Title")[1]),
      "feed > Entry:nth-of-type(2) > Title",
    );
  });

  it("only treats a root <html> as the top of the selector", () => {
    const $ = cheerio.load("<root><html><a/></html><html><a/></html></root>", { xml: true });
    const ctx = createSelectorContext({ adapter: "domhandler" });
    for (const el of $("*").toArray()) assertResolvesCheerio($, ctx.cssSelectorOf(el), el);
  });

  it("keeps HTML output unchanged for ordinary documents", () => {
    const doc = makeDom("<body><main><section><a></a><a></a></section></main></body>");
    assert.equal(
      createSelectorContext().cssSelectorOf(doc.querySelectorAll("a")[1]),
      "body > main > section > a:nth-of-type(2)",
    );
  });
});

describe("regressions: XPath through non-HTML names", () => {
  const MIXED =
    '<!doctype html><body><p class="MsoNormal">a<o:p></o:p></p><p>b<fb:like></fb:like><fb:like></fb:like></p><svg><g></g><foreignObject><i>x</i></foreignObject><foreignObject></foreignObject></svg><math><mi>x</mi><mi>y</mi></math><div><a></a></div></body>';

  it("resolves XPaths through prefixed tags, SVG and MathML (jsdom)", () => {
    const doc = makeDom(MIXED);
    const ctx = createSelectorContext();
    for (const el of Array.from(doc.querySelectorAll("*"))) {
      const xpath = ctx.xpathOf(el);
      assert.equal(evaluateXPath(doc, xpath), el, xpath);
    }
    const i = doc.querySelector("i");
    assert.equal(
      ctx.xpathOf(i),
      "/html/body[1]/*[local-name(.)='svg'][1]/*[local-name(.)='foreignObject'][1]/i[1]",
    );
    assert.equal(
      ctx.xpathOf(doc.querySelector("p")?.lastElementChild),
      "/html/body[1]/p[1]/*[local-name(.)='o:p'][1]",
    );
    assert.equal(
      ctx.xpathOf(doc.querySelectorAll("p")[1]?.lastElementChild, { omitFirstIndex: true }),
      "/html/body/p[2]/*[local-name(.)='fb:like'][2]",
    );
    // Ordinary HTML steps are unchanged.
    assert.equal(ctx.xpathOf(doc.querySelector("a")), "/html/body[1]/div[1]/a[1]");
  });

  it("gives the same XPaths for Cheerio (parse5) as for the DOM", () => {
    const doc = makeDom(MIXED);
    const $ = cheerio.load(MIXED);
    const dom = createSelectorContext();
    const ch = createSelectorContext({ adapter: "domhandler" });
    const chAll = $("*").toArray();
    Array.from(doc.querySelectorAll("*")).forEach((el, i) => {
      assert.equal(ch.xpathOf(chAll[i]), dom.xpathOf(el));
    });
  });

  it("keeps the case of XML names (DOMParser and Cheerio xml)", () => {
    const xml =
      '<feed xmlns:ns="urn:x"><Entry><Title/></Entry><Entry><Title/><ns:item/></Entry></feed>';
    const { DOMParser } = new JSDOM("").window;
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const ctx = createSelectorContext();
    for (const el of Array.from(doc.querySelectorAll("*"))) {
      assert.equal(evaluateXPath(doc, ctx.xpathOf(el)), el, ctx.xpathOf(el));
    }
    const $ = cheerio.load(xml, { xml: true });
    const ch = createSelectorContext({ adapter: "domhandler" });
    assert.equal(ch.xpathOf($("Title")[1]), "/feed[1]/Entry[2]/Title[1]");
    assert.equal(ch.xpathOf($("Entry").children()[2]), "/feed[1]/Entry[2]/*[name(.)='ns:item'][1]");
  });

  it("quotes names containing an apostrophe", () => {
    const doc = makeDom("<!doctype html><body><a'b></a'b></body>");
    const el = doc.body.firstElementChild as Element;
    const xpath = createSelectorContext().xpathOf(el);
    assert.equal(xpath, `/html/body[1]/*[local-name(.)="a'b"][1]`);
    assert.equal(evaluateXPath(doc, xpath), el);
  });
});

describe("regressions: quirks mode", () => {
  const QUIRKS =
    '<html><body><p class="Card"></p><p class="card"></p><div id="Main"><i></i></div><div id="main"></div><span class="Solo"></span></body></html>';

  it("treats classes and ids as case-insensitive in quirks-mode documents (DOM)", () => {
    const doc = makeDom(QUIRKS);
    assert.equal(doc.compatMode, "BackCompat");
    const ctx = createSelectorContext();
    const p = doc.querySelector("p");
    const i = doc.querySelector("i");
    assert.equal(ctx.cssSelectorOf(p), "body > p:nth-of-type(1)");
    assert.equal(ctx.cssSelectorOf(i), "body > div:nth-of-type(1) > i");
    // Distinct names still work and keep their case.
    assert.equal(ctx.cssSelectorOf(doc.querySelector("span")), "body > span.Solo");
  });

  it("treats classes and ids as case-insensitive in quirks-mode documents (Cheerio)", () => {
    const $ = cheerio.load(QUIRKS);
    const ctx = createSelectorContext({ adapter: "domhandler" });
    assert.equal(ctx.cssSelectorOf($("p")[0]), "body > p:nth-of-type(1)");
    assert.equal(ctx.cssSelectorOf($("i")[0]), "body > div:nth-of-type(1) > i");
  });

  it("stays case-sensitive in standards mode", () => {
    const doc = makeDom(`<!doctype html>${QUIRKS}`);
    const ctx = createSelectorContext();
    assert.equal(ctx.cssSelectorOf(doc.querySelector("p")), "body > p.Card");
    assert.equal(ctx.cssSelectorOf(doc.querySelector("i")), "#Main > i");
  });
});

describe("regressions: classes and attributes", () => {
  it("splits classes on ASCII whitespace only", () => {
    const html = '<!doctype html><body><p class="a\u00a0b"></p><p class="b"></p></body>';
    const doc = makeDom(html);
    const $ = cheerio.load(html);
    const p = doc.querySelector("p") as Element;
    const selector = createSelectorContext().cssSelectorOf(p);
    assertResolves(doc, selector, p);
    assert.equal(
      createSelectorContext({ adapter: "domhandler" }).cssSelectorOf($("p")[0]),
      selector,
    );
  });

  it("compares case-insensitive HTML attribute values without case", () => {
    const doc = makeDom(
      '<!doctype html><body><input type="text"><input type="TEXT"><input type="email"><b data-x="A"></b><b data-x="a"></b></body>',
    );
    const ctx = createSelectorContext({ attributes: ["type", "data-x"] });
    const inputs = Array.from(doc.querySelectorAll("input"));
    assert.equal(ctx.cssSelectorOf(inputs[0]), "body > input:nth-of-type(1)");
    assert.equal(ctx.cssSelectorOf(inputs[2]), '[type="email"]');
    // data-* values stay case-sensitive.
    assert.equal(ctx.cssSelectorOf(doc.querySelector("b")), '[data-x="A"]');
    for (const el of Array.from(doc.querySelectorAll("*"))) {
      assertResolves(doc, ctx.cssSelectorOf(el), el);
    }
  });
});
