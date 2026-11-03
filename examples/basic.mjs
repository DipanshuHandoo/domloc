// Minimal usage with jsdom: one context per document, then a selector and an XPath per element.
import assert from "node:assert/strict";
import { createSelectorContext } from "@dipanshuhandoo/domloc";
import { JSDOM } from "jsdom";

const { document } = new JSDOM(`<body>
  <nav id="top"><a href="/home">Home</a><a href="/docs">Docs</a></nav>
  <main><section class="hero"><a href="/start">Start</a></section></main>
</body>`).window;

const ctx = createSelectorContext();
const rows = Array.from(document.querySelectorAll("a"), (a) => ({
  href: a.getAttribute("href"),
  selector: ctx.cssSelectorOf(a),
  xpath: ctx.xpathOf(a),
}));

assert.deepEqual(rows, [
  { href: "/home", selector: "#top > a:nth-of-type(1)", xpath: "/html/body[1]/nav[1]/a[1]" },
  { href: "/docs", selector: "#top > a:nth-of-type(2)", xpath: "/html/body[1]/nav[1]/a[2]" },
  {
    href: "/start",
    selector: "body > main > section.hero > a",
    xpath: "/html/body[1]/main[1]/section[1]/a[1]",
  },
]);
for (const row of rows)
  assert.equal(document.querySelector(row.selector)?.getAttribute("href"), row.href);
console.table(rows);
