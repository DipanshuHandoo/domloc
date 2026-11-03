import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cheerio from "cheerio";
import { createSelectorContext, xpathOf } from "../src/index.ts";
import {
  allElements,
  evaluateXPath,
  FIXTURE,
  legacyCheerioXpath,
  legacyFragmentXpath,
  legacyLinksXpath,
  makeDom,
} from "./helpers.ts";

describe("xpathOf", () => {
  it("is byte-identical to the legacy positional builder for every element", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    for (const el of allElements(doc)) assert.equal(ctx.xpathOf(el), legacyLinksXpath(el));
  });

  it("omitFirstIndex is byte-identical to the legacy fragment builder", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    for (const el of allElements(doc)) {
      assert.equal(ctx.xpathOf(el, { omitFirstIndex: true }), legacyFragmentXpath(el));
    }
  });

  it("caches both formats independently", () => {
    const doc = makeDom();
    const ctx = createSelectorContext();
    const link = doc.querySelector('a[href="/y"]');
    const full = ctx.xpathOf(link);
    const short = ctx.xpathOf(link, { omitFirstIndex: true });
    assert.equal(ctx.xpathOf(link), full);
    assert.equal(ctx.xpathOf(link, { omitFirstIndex: true }), short);
    assert.notEqual(full, short);
  });

  it("resolves back to the same element", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    for (const el of allElements(doc)) assert.equal(evaluateXPath(doc, ctx.xpathOf(el)), el);
  });

  it("matches the legacy domhandler builder for Cheerio nodes", () => {
    const $ = cheerio.load(FIXTURE);
    const ctx = createSelectorContext({ adapter: "domhandler" });
    for (const el of $("*").toArray()) {
      assert.equal(ctx.xpathOf(el), legacyCheerioXpath(el as never));
    }
  });

  it("returns an empty string for missing or non-element nodes", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    assert.equal(ctx.xpathOf(null), "");
    assert.equal(ctx.xpathOf(undefined), "");
    assert.equal(ctx.xpathOf(doc), "");
    assert.equal(ctx.xpathOf(doc.createTextNode("x")), "");
    assert.equal(ctx.xpathOf(doc.createComment("x")), "");
    assert.equal(ctx.xpathOf({}), "");
  });

  it("one-off helper accepts context and XPath options together", () => {
    const doc = makeDom();
    const link = doc.querySelector('a[href="/f2"]');
    assert.equal(xpathOf(link), "/html/body[1]/footer[1]/ul[1]/li[2]/a[1]");
    assert.equal(xpathOf(link, { omitFirstIndex: true }), "/html/body/footer/ul/li[2]/a");
  });
});
