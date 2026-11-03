import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as cheerio from "cheerio";
import fc from "fast-check";
import { createSelectorContext } from "../src/index.ts";
import { allElements, evaluateXPath, makeDom } from "./helpers.ts";

interface Spec {
  tag: string;
  id: string | null;
  classes: string[];
  testid: string | null;
  kids: Spec[];
}

const TAGS = ["div", "section", "span", "ul", "li", "a", "em", "my-el", "o:p"];
const IDS = ["main", "Main", "x.y", "1st", "dup", "abc-12345", "nav"];
const CLASSES = ["card", "Card", "active", "item", "is-open", "k:v", "css-1x2y3z", "b"];

const { tree } = fc.letrec<{ tree: Spec }>((tie) => ({
  tree: fc.record({
    tag: fc.constantFrom(...TAGS),
    id: fc.option(fc.constantFrom(...IDS), { freq: 3 }),
    classes: fc.subarray(CLASSES, { maxLength: 3 }),
    testid: fc.option(fc.constantFrom("t1", "t2", "t3"), { freq: 4 }),
    kids: fc.oneof(
      { depthSize: "small", maxDepth: 4 },
      fc.constant<Spec[]>([]),
      fc.array(tie("tree"), { maxLength: 4 }),
    ),
  }),
}));

const attr = (name: string, value: string) => ` ${name}="${value.replace(/"/g, "&quot;")}"`;
const render = (s: Spec): string =>
  `<${s.tag}${s.id ? attr("id", s.id) : ""}${s.classes.length ? attr("class", s.classes.join(" ")) : ""}${s.testid ? attr("data-testid", s.testid) : ""}>${s.kids.map(render).join("")}</${s.tag}>`;

describe("property: random documents", () => {
  for (const [label, options] of [
    ["defaults", {}],
    ["attributes", { attributes: ["data-testid"] }],
    ["no deny lists", { classDenyList: [], idDenyPattern: "^$" }],
  ] as const) {
    it(`every selector and XPath resolves to exactly its element (${label})`, () => {
      fc.assert(
        fc.property(
          fc.array(tree, { minLength: 1, maxLength: 4 }),
          fc.boolean(),
          (roots, quirks) => {
            const html = `${quirks ? "" : "<!doctype html>"}<html><head></head><body>${roots.map(render).join("")}</body></html>`;
            const doc = makeDom(html);
            const ctx = createSelectorContext(options);
            const $ = cheerio.load(html);
            const chCtx = createSelectorContext({ ...options, adapter: "domhandler" });
            const chAll = $("*").toArray();
            const domAll = allElements(doc);
            assert.equal(chAll.length, domAll.length);
            domAll.forEach((el, i) => {
              const selector = ctx.cssSelectorOf(el);
              const matches = doc.querySelectorAll(selector);
              assert.equal(matches.length, 1, `${selector}\n${html}`);
              assert.equal(matches[0], el, `${selector}\n${html}`);
              const xpath = ctx.xpathOf(el);
              assert.equal(evaluateXPath(doc, xpath), el, xpath);
              assert.equal(chCtx.cssSelectorOf(chAll[i]), selector);
              assert.equal(chCtx.xpathOf(chAll[i]), ctx.xpathOf(el));
            });
          },
        ),
        { numRuns: 150 },
      );
    });
  }
});
