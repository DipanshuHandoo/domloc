import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { JSDOM } from "jsdom";
import { createSelectorContext, getBrowserScript, isDomlocError } from "../src/index.ts";
import { clearBrowserScript, FIXTURE, provideBrowserScript } from "./helpers.ts";

const API_KEYS = [
  "DEFAULT_CLASS_DENY_LIST",
  "DEFAULT_ID_DENY_PATTERN",
  "DomlocError",
  "InvalidOptionError",
  "createSelectorContext",
  "cssEscape",
  "cssSelectorOf",
  "domAdapter",
  "domhandlerAdapter",
  "isDomlocError",
  "presets",
  "xpathOf",
];

describe("getBrowserScript", () => {
  it("throws a typed error when the script was not built", () => {
    clearBrowserScript();
    assert.throws(getBrowserScript, (error: unknown) => {
      assert.ok(isDomlocError(error));
      assert.equal(error.code, "ERR_BROWSER_SCRIPT_UNAVAILABLE");
      return true;
    });
  });

  describe("with the built script", () => {
    before(provideBrowserScript);
    after(clearBrowserScript);

    it("defines window.domloc with the same results as Node, idempotently", () => {
      const dom = new JSDOM(FIXTURE, { runScripts: "outside-only" });
      dom.window.eval(getBrowserScript());
      const first = dom.window.eval("window.domloc") as object;
      dom.window.eval(getBrowserScript());
      assert.equal(dom.window.eval("window.domloc"), first);
      assert.deepEqual(Object.keys(first).sort(), API_KEYS);

      const inPage = dom.window.eval(
        `(() => { const ctx = window.domloc.createSelectorContext(); return Array.from(document.querySelectorAll('a')).map((a) => [ctx.cssSelectorOf(a), ctx.xpathOf(a), ctx.xpathOf(a, { omitFirstIndex: true })]); })()`,
      );
      const ctx = createSelectorContext({ adapter: "dom" });
      const expected = Array.from(dom.window.document.querySelectorAll("a")).map((a) => [
        ctx.cssSelectorOf(a),
        ctx.xpathOf(a),
        ctx.xpathOf(a, { omitFirstIndex: true }),
      ]);
      assert.deepEqual(JSON.parse(JSON.stringify(inPage)), expected);
    });

    it("accepts serialisable string patterns and in-page presets", () => {
      const dom = new JSDOM(FIXTURE, { runScripts: "outside-only" });
      dom.window.eval(getBrowserScript());
      const result = dom.window.eval(`(() => {
        const marquee = document.querySelector('.marquee');
        const strings = window.domloc.createSelectorContext({ classDenyList: ['^marquee$'], idDenyPattern: '^main' });
        const milo = window.domloc.createSelectorContext(window.domloc.presets.milo);
        return [strings.cssSelectorOf(marquee), milo.cssSelectorOf(marquee)];
      })()`);
      assert.deepEqual(JSON.parse(JSON.stringify(result)), [
        "body > main > div:nth-of-type(1) > div",
        "#main-content > div:nth-of-type(1) > div.marquee",
      ]);
    });

    it("does not overwrite an existing global", () => {
      const dom = new JSDOM("<p></p>", { runScripts: "outside-only" });
      dom.window.eval("window.domloc = { mine: true }");
      dom.window.eval(getBrowserScript());
      assert.equal(dom.window.eval("window.domloc.mine"), true);
    });
  });
});
