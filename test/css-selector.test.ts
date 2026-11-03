import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cheerio from "cheerio";
import {
  createSelectorContext,
  cssSelectorOf,
  DEFAULT_CLASS_DENY_LIST,
  DEFAULT_ID_DENY_PATTERN,
  presets,
} from "../src/index.ts";
import { allElements, FIXTURE, makeDom } from "./helpers.ts";

const assertUniqueInDom = (doc: Document, selector: string, el: Element) => {
  const matches = doc.querySelectorAll(selector);
  assert.equal(matches.length, 1, selector);
  assert.equal(matches[0], el, selector);
};

describe("cssSelectorOf", () => {
  for (const [label, options] of [
    ["default", {}],
    ["milo preset", presets.milo],
  ] as const) {
    it(`is unique and resolves to the same element for every element (jsdom, ${label})`, () => {
      const doc = makeDom();
      const ctx = createSelectorContext({ adapter: "dom", ...options });
      for (const el of allElements(doc)) assertUniqueInDom(doc, ctx.cssSelectorOf(el), el);
    });

    it(`is unique for every element (Cheerio, ${label})`, () => {
      const $ = cheerio.load(FIXTURE);
      const ctx = createSelectorContext({ adapter: "domhandler", ...options });
      for (const el of $("*").toArray()) {
        const selector = ctx.cssSelectorOf(el);
        const matches = $(selector);
        assert.equal(matches.length, 1, selector);
        assert.equal(matches[0], el);
      }
    });
  }

  it("anchors on a unique id and starts at body otherwise", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    assert.equal(
      ctx.cssSelectorOf(doc.querySelector('a[href="/x"]')),
      "#main-content > div:nth-of-type(1) > div.marquee > div > div > p > a:nth-of-type(1)",
    );
    assert.equal(
      ctx.cssSelectorOf(doc.querySelector('a[href="/f2"]')),
      "body > footer > ul > li:nth-of-type(2) > a",
    );
    assert.equal(
      ctx.cssSelectorOf(doc.querySelector('#gnav a[href="/b"]')),
      "#gnav > nav > a:nth-of-type(2)",
    );
  });

  it("uses a class only when no same-tag sibling shares it", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    assert.ok(ctx.cssSelectorOf(doc.querySelector(".marquee")).endsWith("div.marquee"));
    const cards = Array.from(doc.querySelectorAll(".card")).map((c) => ctx.cssSelectorOf(c));
    assert.ok(cards[0]?.endsWith("div:nth-of-type(1)"));
    assert.ok(cards[1]?.endsWith("div:nth-of-type(2)"));
    const texts = Array.from(doc.querySelectorAll(".text")).map((c) => ctx.cssSelectorOf(c));
    assert.ok(!texts[0]?.includes(".text"));
  });

  it("only considers the first class", () => {
    const doc = makeDom('<body><div class="a b"></div><div class="c b"></div></body>');
    const ctx = createSelectorContext();
    assert.equal(ctx.cssSelectorOf(doc.querySelector(".a")), "body > div.a");
  });

  it("ignores generated and duplicate ids", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    assert.ok(!ctx.cssSelectorOf(doc.querySelector('a[href="/gen"]')).includes("#12345678"));
    assert.ok(!ctx.cssSelectorOf(doc.querySelector('a[href="/d1"]')).includes("#dup"));
  });

  it("escapes ids that need it", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    const link = doc.querySelector('a[href="/e"]') as Element;
    const selector = ctx.cssSelectorOf(link);
    assert.equal(selector, "#we\\:ird\\.id > a");
    assert.equal(doc.querySelector(selector), link);
  });

  it("honours a custom class deny list (strings or RegExp)", () => {
    const doc = makeDom();
    for (const classDenyList of [["^marquee$"], [/^marquee$/]]) {
      const ctx = createSelectorContext({ adapter: "dom", classDenyList });
      assert.equal(
        ctx.cssSelectorOf(doc.querySelector(".marquee")),
        "#main-content > div:nth-of-type(1) > div",
      );
    }
  });

  it("an empty class deny list allows every class", () => {
    const doc = makeDom('<body><p class="active"></p><p></p></body>');
    assert.equal(cssSelectorOf(doc.querySelector(".active")), "body > p:nth-of-type(1)");
    assert.equal(
      cssSelectorOf(doc.querySelector(".active"), { classDenyList: [] }),
      "body > p.active",
    );
  });

  it("honours a custom id deny pattern (string or RegExp)", () => {
    const doc = makeDom('<body><div id="keep-me"><a></a></div></body>');
    const a = doc.querySelector("a");
    assert.equal(cssSelectorOf(a), "#keep-me > a");
    assert.equal(cssSelectorOf(a, { idDenyPattern: "^keep" }), "body > div > a");
    assert.equal(cssSelectorOf(a, { idDenyPattern: /KEEP/i }), "body > div > a");
  });

  it("is not affected by global or sticky RegExp state", () => {
    const doc = makeDom(
      '<body><ul><li class="skip">a</li><li class="skip2">b</li><li class="skip3">c</li></ul></body>',
    );
    const ctx = createSelectorContext({ classDenyList: [/skip/g], idDenyPattern: /x/y });
    const selectors = Array.from(doc.querySelectorAll("li")).map((li) => ctx.cssSelectorOf(li));
    assert.deepEqual(selectors, [
      "body > ul > li:nth-of-type(1)",
      "body > ul > li:nth-of-type(2)",
      "body > ul > li:nth-of-type(3)",
    ]);
  });

  it("gives identical results for the same HTML in jsdom and Cheerio", () => {
    const doc = makeDom();
    const $ = cheerio.load(FIXTURE);
    const domCtx = createSelectorContext({ adapter: "dom" });
    const chCtx = createSelectorContext({ adapter: "domhandler" });
    const domAll = allElements(doc);
    const chAll = $("*").toArray();
    assert.equal(chAll.length, domAll.length);
    domAll.forEach((el, i) => {
      assert.equal(chCtx.cssSelectorOf(chAll[i]), domCtx.cssSelectorOf(el));
      assert.equal(chCtx.xpathOf(chAll[i]), domCtx.xpathOf(el));
    });
  });

  it("returns the tag for html and body, and '' for non-elements", () => {
    const doc = makeDom();
    const ctx = createSelectorContext({ adapter: "dom" });
    assert.equal(ctx.cssSelectorOf(doc.documentElement), "html");
    assert.equal(ctx.cssSelectorOf(doc.body), "body");
    assert.equal(ctx.cssSelectorOf(null), "");
    assert.equal(ctx.cssSelectorOf(doc), "");
    assert.equal(ctx.cssSelectorOf(doc.createTextNode("x")), "");
    assert.equal(ctx.cssSelectorOf(doc.createComment("x")), "");
  });

  it("returns cached results on repeated calls and isolates contexts", () => {
    const doc = makeDom();
    const a = createSelectorContext();
    const b = createSelectorContext({ classDenyList: [/^marquee$/] });
    const marquee = doc.querySelector(".marquee");
    const first = a.cssSelectorOf(marquee);
    assert.equal(a.cssSelectorOf(marquee), first);
    assert.notEqual(b.cssSelectorOf(marquee), first);
    assert.equal(a.cssSelectorOf(marquee), first);
  });
});

describe("default deny lists", () => {
  const denied = (cls: string) => DEFAULT_CLASS_DENY_LIST.some((re) => re.test(cls));

  it("deny runtime state and generated classes", () => {
    for (const cls of [
      "active",
      "open",
      "hidden",
      "is-open",
      "has-icon",
      "js-toggle",
      "1col",
      "css-1hwfws3",
      "sc-bdVaJa",
      "jsx-2311283",
      "svelte-1x2y3z",
      "ng-star-inserted",
      "Button_title__a1b2c",
      "block-12345",
      "x-deadbeef42",
    ]) {
      assert.ok(denied(cls), cls);
    }
  });

  it("allow ordinary, meaningful classes (including Milo block names)", () => {
    for (const cls of [
      "section",
      "card",
      "nav",
      "btn-primary",
      "col-6",
      "marquee",
      "con-block",
      "has",
      "card__title",
      "dark",
      "grid",
    ]) {
      assert.ok(!denied(cls), cls);
    }
  });

  it("deny generated ids, including React useId values", () => {
    for (const id of ["1abc", "item-12345", "x-0123abcd", ":r1:", ":R2a:", "«r3»", "_r_4_"]) {
      assert.ok(DEFAULT_ID_DENY_PATTERN.test(id), id);
    }
    for (const id of ["main", "main-content", "gnav", "row-12", "radio"]) {
      assert.ok(!DEFAULT_ID_DENY_PATTERN.test(id), id);
    }
  });

  it("the milo preset reproduces the original Adobe deny list", () => {
    const doc = makeDom(
      '<body><div class="con-block x"></div><div class="xs-spacing y"></div><div class="slide-up"></div><div class="grid"></div></body>',
    );
    const generic = createSelectorContext();
    const milo = createSelectorContext(presets.milo);
    const divs = Array.from(doc.querySelectorAll("div"));
    assert.deepEqual(
      divs.map((d) => generic.cssSelectorOf(d)),
      ["body > div.con-block", "body > div.xs-spacing", "body > div.slide-up", "body > div.grid"],
    );
    assert.deepEqual(
      divs.map((d) => milo.cssSelectorOf(d)),
      [
        "body > div:nth-of-type(1)",
        "body > div:nth-of-type(2)",
        "body > div:nth-of-type(3)",
        "body > div:nth-of-type(4)",
      ],
    );
    assert.ok(Object.isFrozen(presets) && Object.isFrozen(presets.milo));
    assert.ok(Object.isFrozen(DEFAULT_CLASS_DENY_LIST));
  });
});

describe("attributes option", () => {
  const HTML = `<body>
    <form><button data-testid="save">Save</button><button data-testid="dup">A</button><button data-testid="dup">B</button>
    <input name="email"><input name="q&quot;x"><span data-testid=""></span></form>
    <div id="panel"><a data-testid="go">Go</a></div>
  </body>`;

  it("anchors on a document-unique attribute value, before the id", () => {
    const doc = makeDom(HTML);
    const ctx = createSelectorContext({ attributes: ["data-testid", "name"] });
    const save = doc.querySelector('[data-testid="save"]') as Element;
    const go = doc.querySelector('[data-testid="go"]') as Element;
    const email = doc.querySelector('[name="email"]') as Element;
    assert.equal(ctx.cssSelectorOf(save), '[data-testid="save"]');
    assert.equal(ctx.cssSelectorOf(go), '[data-testid="go"]');
    assert.equal(ctx.cssSelectorOf(email), '[name="email"]');
    for (const el of allElements(doc)) assertUniqueInDom(doc, ctx.cssSelectorOf(el), el);
  });

  it("skips duplicate and empty values and escapes quotes", () => {
    const doc = makeDom(HTML);
    const ctx = createSelectorContext({ attributes: ["data-testid", "name"] });
    const dup = doc.querySelectorAll('[data-testid="dup"]')[1] as Element;
    assert.equal(ctx.cssSelectorOf(dup), "body > form > button:nth-of-type(3)");
    const quoted = doc.querySelector("input:nth-of-type(2)") as Element;
    assert.equal(ctx.cssSelectorOf(quoted), '[name="q\\"x"]');
    assertUniqueInDom(doc, ctx.cssSelectorOf(quoted), quoted);
    assert.equal(ctx.cssSelectorOf(doc.querySelector("span")), "body > form > span");
  });

  it("is off by default", () => {
    const doc = makeDom(HTML);
    assert.equal(cssSelectorOf(doc.querySelector('[data-testid="go"]')), "#panel > a");
  });

  it("works with Cheerio and gives the same output as jsdom", () => {
    const doc = makeDom(HTML);
    const $ = cheerio.load(HTML);
    const options = { attributes: ["data-testid", "name"] };
    const domCtx = createSelectorContext(options);
    const chCtx = createSelectorContext({ ...options, adapter: "domhandler" });
    const chAll = $("*").toArray();
    allElements(doc).forEach((el, i) => {
      const selector = chCtx.cssSelectorOf(chAll[i]);
      assert.equal(selector, domCtx.cssSelectorOf(el));
      assert.equal($(selector).length, 1, selector);
    });
  });
});
