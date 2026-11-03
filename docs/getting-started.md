# Getting started

## Requirements

Node.js >= 22.18.0. The package ships ESM and CommonJS builds with TypeScript declarations and
has no runtime dependencies. Install Cheerio, jsdom or Playwright yourself if you need them.

```sh
npm install @dipanshuhandoo/domloc
```

## The one rule: one context per document

`createSelectorContext()` returns `{ cssSelectorOf, xpathOf }`. The context caches sibling
groups, ancestor prefixes and document-wide id counts. Selectors for thousands of elements in
the same document therefore cost little more than one. Create a new context for each document,
and again after you mutate a document.

```js
import { createSelectorContext } from "@dipanshuhandoo/domloc";

const ctx = createSelectorContext({ adapter: "domhandler" });
const rows = links.map((el) => ({ selector: ctx.cssSelectorOf(el), xpath: ctx.xpathOf(el) }));
```

`cssSelectorOf(node, options)` and `xpathOf(node, options)` are one-off helpers that create a
throwaway context for each call. They are fine for a handful of nodes but slow in a loop.

Any value that is not an element returns `''`: text, comments, documents, `null` and
`undefined`.

## Cheerio / domhandler

```js
import * as cheerio from "cheerio";
import { createSelectorContext } from "@dipanshuhandoo/domloc";

const $ = cheerio.load(html);
const ctx = createSelectorContext({ adapter: "domhandler" });
$("a").each((_i, el) => console.log(ctx.cssSelectorOf(el), ctx.xpathOf(el)));
```

This works with nodes from any selection or traversal (`.children()`, `.find()`, `$.root()`),
with `<script>` and `<style>` elements, with fragments (`cheerio.load(html, null, false)`) and
with XML (`{ xml: true }`). It also works with plain `htmlparser2` or `parse5` trees that use
domhandler nodes.

## jsdom and browser DOM

```js
import { JSDOM } from "jsdom";
import { createSelectorContext } from "@dipanshuhandoo/domloc";

const { document } = new JSDOM(html).window;
const ctx = createSelectorContext(); // adapter: "dom"
```

## Playwright, Puppeteer and plain pages

Inject the script once per page. It is idempotent and defines `window.domloc`:

```js
import { getBrowserScript } from "@dipanshuhandoo/domloc";

await page.evaluate(getBrowserScript());
const result = await page.evaluate(() =>
  window.domloc.createSelectorContext().cssSelectorOf(document.querySelector("h1")),
);
```

More in [Browser, Playwright and Puppeteer](browser.md).

## CommonJS and TypeScript

```js
const { createSelectorContext } = require("@dipanshuhandoo/domloc");
```

Types are bundled. Use `moduleResolution` `node16`, `nodenext` or `bundler`.

## Next steps

- [Configuration](configuration.md): deny-lists, presets and the `attributes` option
- [How it works](how-it-works.md)
- [Examples](https://github.com/DipanshuHandoo/domloc/tree/main/examples)
