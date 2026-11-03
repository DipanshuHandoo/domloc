// Tour of the public API: context reuse, options, presets, attributes, helpers and errors.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  createSelectorContext,
  cssEscape,
  cssSelectorOf,
  DEFAULT_CLASS_DENY_LIST,
  InvalidOptionError,
  isDomlocError,
  presets,
  xpathOf,
} from "@dipanshuhandoo/domloc";
import { JSDOM } from "jsdom";

const { document } = new JSDOM(`<body>
  <div id="app">
    <ul class="menu is-open"><li class="active">Home</li><li>About</li></ul>
    <div class="con-block marquee"><button data-testid="cta">Buy</button><button>More</button></div>
    <div id=":r1:"><span>react useId</span></div>
    <div class="css-1x2y3z"><em>emotion</em></div>
  </div>
</body>`).window;
const $ = (selector) => document.querySelector(selector);

// 1. One context per document. It memoises sibling groups, ancestor prefixes and id counts.
const ctx = createSelectorContext();
assert.equal(ctx.cssSelectorOf($(".menu")), "#app > ul.menu");
// Runtime state classes (active, is-*, ...) are skipped; position is used instead.
assert.equal(ctx.cssSelectorOf($(".active")), "#app > ul.menu > li:nth-of-type(1)");
// Generated ids (React useId) and CSS-in-JS classes never anchor a selector.
assert.equal(ctx.cssSelectorOf($("span")), "#app > div:nth-of-type(2) > span");
assert.equal(ctx.cssSelectorOf($("em")), "#app > div:nth-of-type(3) > em");
// XPath is absolute and positional; omitFirstIndex drops every [1].
assert.equal(ctx.xpathOf($("em")), "/html/body[1]/div[1]/div[3]/em[1]");
assert.equal(ctx.xpathOf($("em"), { omitFirstIndex: true }), "/html/body/div/div[3]/em");

// 2. Stable test attributes, opt in. Checked before ids, value must be unique in the document.
const testIds = createSelectorContext({ attributes: ["data-testid"] });
assert.equal(testIds.cssSelectorOf($("button")), '[data-testid="cta"]');

// 3. Deny lists: extend the defaults, replace them, or use a platform preset.
const custom = createSelectorContext({ classDenyList: [...DEFAULT_CLASS_DENY_LIST, /^menu$/] });
assert.equal(custom.cssSelectorOf($(".menu")), "#app > ul");
const milo = createSelectorContext(presets.milo);
assert.equal(milo.cssSelectorOf($(".marquee")), "#app > div:nth-of-type(1)");
assert.equal(ctx.cssSelectorOf($(".marquee")), "#app > div.con-block");

// 4. One-off helpers build a throwaway context: fine for a few calls, slower in loops.
assert.equal(cssSelectorOf($("em")), ctx.cssSelectorOf($("em")));
assert.equal(xpathOf($("em"), { omitFirstIndex: true }), "/html/body/div/div[3]/em");
assert.equal(cssEscape("we:ird.id"), "we\\:ird\\.id");

// 5. Errors are typed, with a stable code.
try {
  createSelectorContext({ adapter: "cheerio" });
  assert.fail("expected an error");
} catch (error) {
  assert.ok(error instanceof InvalidOptionError && isDomlocError(error));
  assert.equal(error.code, "ERR_INVALID_OPTION");
}

// 6. CommonJS consumers get the same API.
const cjs = createRequire(import.meta.url)("@dipanshuhandoo/domloc");
assert.equal(cjs.createSelectorContext().cssSelectorOf($(".menu")), "#app > ul.menu");
console.log("full tour ok");
