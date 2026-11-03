import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cssEscape } from "../src/index.ts";
import { cssString } from "../src/escape.ts";
import { makeDom } from "./helpers.ts";

describe("cssEscape", () => {
  it("matches the CSSOM spec examples", () => {
    assert.equal(cssEscape("we:ird.id"), "we\\:ird\\.id");
    assert.equal(cssEscape("1abc"), "\\31 abc");
    assert.equal(cssEscape("-1a"), "-\\31 a");
    assert.equal(cssEscape("-"), "\\-");
    assert.equal(cssEscape("--x"), "--x");
    assert.equal(cssEscape("a b"), "a\\ b");
    assert.equal(cssEscape("ünï"), "ünï");
    assert.equal(cssEscape("_a-Z9"), "_a-Z9");
    assert.equal(cssEscape("a\u0000b"), "a\uFFFDb");
    assert.equal(cssEscape("a\u0001\u007f"), "a\\1 \\7f ");
    assert.equal(cssEscape(""), "");
    assert.equal(cssEscape(42), "\\34 2");
  });

  it("produces selectors that resolve in jsdom", () => {
    // A backslash is escaped correctly but jsdom's selector engine cannot match it.
    const values = ["a.b", "x:y", "1st", "-2", "with space", 'q"uote', "💥", "[x]"];
    const doc = makeDom(
      `<body>${values.map((v) => `<p id="${v.replace(/"/g, "&quot;")}" class="${v.replace(/"/g, "&quot;")}"></p>`).join("")}</body>`,
    );
    for (const value of values) {
      const byId = doc.querySelectorAll(`#${cssEscape(value)}`);
      assert.equal(byId.length, 1, value);
      assert.equal(byId[0]?.getAttribute("id"), value);
    }
  });
});

describe("cssString", () => {
  it("quotes and escapes per the CSSOM serialize-a-string algorithm", () => {
    assert.equal(cssString("plain"), '"plain"');
    assert.equal(cssString('a"b\\c'), '"a\\"b\\\\c"');
    assert.equal(cssString("x\ny"), '"x\\a y"');
    assert.equal(cssString("\u0000"), '"\uFFFD"');
    assert.equal(cssString("\u007f"), '"\\7f "');
  });
});
