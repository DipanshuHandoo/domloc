// Server-side scraping with Cheerio: selectors computed from source HTML, no browser needed.
import assert from "node:assert/strict";
import { createSelectorContext } from "@dipanshuhandoo/domloc";
import * as cheerio from "cheerio";

const html = `<!doctype html><html><body>
  <header><nav><a href="/a">A</a><a href="/b">B</a></nav></header>
  <main id="content">
    <article class="post"><h2>One</h2><a href="/one">Read</a></article>
    <article class="post"><h2>Two</h2><a href="/two">Read</a></article>
  </main>
</body></html>`;

const $ = cheerio.load(html);
const ctx = createSelectorContext({ adapter: "domhandler" });

const links = $("a")
  .toArray()
  .map((el) => ({
    href: $(el).attr("href"),
    selector: ctx.cssSelectorOf(el),
    xpath: ctx.xpathOf(el),
  }));

assert.deepEqual(
  links.map((l) => l.selector),
  [
    "body > header > nav > a:nth-of-type(1)",
    "body > header > nav > a:nth-of-type(2)",
    "#content > article:nth-of-type(1) > a",
    "#content > article:nth-of-type(2) > a",
  ],
);
// Every selector resolves back to exactly one node in the same document.
for (const link of links) {
  assert.equal($(link.selector).length, 1);
  assert.equal($(link.selector).attr("href"), link.href);
}

// Text, comment and document nodes are not elements: the result is ''.
assert.equal(ctx.cssSelectorOf($.root()[0]), "");
console.table(links);
