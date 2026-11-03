// Inject the browser script into a real page (Playwright) and compute selectors in-page.
// Needs Chromium: `npx playwright install chromium`.
import assert from "node:assert/strict";
import { getBrowserScript } from "@dipanshuhandoo/domloc";
import { chromium } from "playwright";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent(`<body>
    <form><button data-testid="save">Save</button><button>Cancel</button></form>
    <svg><foreignObject><p>inside svg</p></foreignObject></svg>
  </body>`);

  // Idempotent: safe to evaluate before every extraction.
  await page.evaluate(getBrowserScript());
  await page.evaluate(getBrowserScript());

  // Options cross the Node/page boundary as JSON, so patterns are strings here.
  const rows = await page.evaluate(() => {
    const ctx = window.domloc.createSelectorContext({
      attributes: ["data-testid"],
      classDenyList: ["^tmp-"],
    });
    return Array.from(document.querySelectorAll("button, p"), (el) => ({
      text: el.textContent,
      selector: ctx.cssSelectorOf(el),
      xpath: ctx.xpathOf(el),
    }));
  });

  assert.deepEqual(
    rows.map((r) => r.selector),
    [
      '[data-testid="save"]',
      "body > form > button:nth-of-type(2)",
      "body > svg > foreignObject > p",
    ],
  );
  for (const row of rows) {
    const text = await page.locator(`css=${row.selector}`).textContent();
    assert.equal(text, row.text);
  }
  console.table(rows);
} finally {
  await browser.close();
}
