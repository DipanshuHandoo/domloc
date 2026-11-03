# Browser, Playwright and Puppeteer

There are two ways to run domloc inside a page. Both define the same global, `window.domloc`,
whose API matches the package exports except `getBrowserScript`.

## Injecting from Node: `getBrowserScript()`

`getBrowserScript()` returns the minified browser bundle (about 7 kB) as a string. Evaluating it
defines `window.domloc` unless the global already exists. It is idempotent and safe to evaluate
before every extraction.

```js
import { getBrowserScript } from "@dipanshuhandoo/domloc";

// Playwright
await page.evaluate(getBrowserScript());
// or, to survive navigations:
await page.addInitScript(getBrowserScript());

// Puppeteer
await page.evaluate(getBrowserScript());
await page.evaluateOnNewDocument(getBrowserScript());

const rows = await page.evaluate((options) => {
  const ctx = window.domloc.createSelectorContext(options);
  return [...document.querySelectorAll("a")].map((a) => ({
    href: a.href,
    selector: ctx.cssSelectorOf(a),
    xpath: ctx.xpathOf(a),
  }));
}, { attributes: ["data-testid"], classDenyList: ["^tmp-"] });
```

### Passing options across the boundary

Arguments to `page.evaluate` are serialised as JSON, so `RegExp` objects arrive as `{}`. Inside
the page:

- write patterns as strings (`"^tmp-"`; strings have no flags), or
- use the in-page values: `window.domloc.presets.milo` and
  `window.domloc.DEFAULT_CLASS_DENY_LIST`.

```js
await page.evaluate(() => {
  const { createSelectorContext, presets } = window.domloc;
  return createSelectorContext(presets.milo).cssSelectorOf(document.querySelector(".marquee"));
});
```

### Existing globals

If the page already defines `window.domloc`, the script leaves it alone and your calls reach the
page's object. Avoid that name on pages you control.

## Script tag / CDN

```html
<script src="https://unpkg.com/@dipanshuhandoo/domloc/dist/browser/index.min.js"></script>
<script>
  const ctx = domloc.createSelectorContext();
</script>
```

`dist/browser/index.js` (readable) and `dist/browser/index.min.js` (minified) are published with
source maps. Both target ES2020.

## Bundlers

Importing `@dipanshuhandoo/domloc` in a bundled front-end app works too. The package has no
Node-only imports, but it includes the embedded browser script string (about 7 kB). If size
matters, load the browser bundle instead.

## Content Security Policy

`addScriptTag` and `<script>` injection are subject to the page's CSP. If a strict CSP blocks
them, use `page.evaluate` / `addInitScript`, or create the Playwright context with
`bypassCSP: true`.
