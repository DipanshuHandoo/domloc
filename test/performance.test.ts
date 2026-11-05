import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSelectorContext } from "../src/index.ts";
import { allElements, makeDom } from "./helpers.ts";

// Wall-clock budgets are flaky on shared CI runners and under coverage instrumentation, so this
// runs locally only (set DOMLOC_PERF=1 to force it).
const skip = (!!process.env.CI || !!process.env.DOMLOC_COVERAGE) && !process.env.DOMLOC_PERF;

describe("performance", { skip }, () => {
  it("handles a ~5,000 element page with 1,000 links well inside the budget", () => {
    const rows = Array.from(
      { length: 500 },
      (_v, i) =>
        `<div class="section"><div class="block${i % 7}"><p>t${i}</p><ul><li><a href="/${i}">a</a></li><li><a href="/${i}b">b</a></li></ul></div></div>`,
    ).join("");
    const doc = makeDom(`<html><body><main>${rows}</main></body></html>`);
    const links = Array.from(doc.querySelectorAll("a"));
    const ctx = createSelectorContext({ adapter: "dom" });
    const start = performance.now();
    for (const a of links) {
      ctx.cssSelectorOf(a);
      ctx.xpathOf(a);
    }
    const elapsed = performance.now() - start;
    assert.ok(allElements(doc).length > 3000);
    assert.ok(elapsed < 1500, `took ${elapsed.toFixed(1)} ms`);
  });
});
