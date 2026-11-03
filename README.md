# domloc

Readable, unique CSS selectors and absolute XPaths for DOM elements. The same algorithm runs in
the **browser** (including Playwright and Puppeteer pages), **jsdom** and **Cheerio**
(domhandler), with zero runtime dependencies.

[![CI](https://github.com/DipanshuHandoo/domloc/actions/workflows/ci.yml/badge.svg)](https://github.com/DipanshuHandoo/domloc/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@dipanshuhandoo/domloc)](https://www.npmjs.com/package/@dipanshuhandoo/domloc)
[![types](https://img.shields.io/npm/types/@dipanshuhandoo/domloc)](https://www.npmjs.com/package/@dipanshuhandoo/domloc)
[![license](https://img.shields.io/npm/l/@dipanshuhandoo/domloc)](LICENSE)

```text
#main > div.section:nth-of-type(2) > div.marquee > p > a:nth-of-type(2)
/html/body[1]/main[1]/div[2]/div[1]/p[1]/a[2]
```

Most selector generators need a live DOM and check each candidate with `querySelectorAll`.
domloc builds every step so it is unique among its siblings, so it never has to query the
document. That makes it fast for thousands of elements, and it works on Cheerio trees parsed on a
server, where no DOM exists.

## Requirements

Node.js >= 22.18.0 for the npm package. The browser bundle targets ES2020.

## Install

```sh
npm install @dipanshuhandoo/domloc
```

## Quick start

### Cheerio (server-side, no browser)

```js
import * as cheerio from "cheerio";
import { createSelectorContext } from "@dipanshuhandoo/domloc";

const $ = cheerio.load(html);
const ctx = createSelectorContext({ adapter: "domhandler" }); // one context per document

for (const a of $("a").toArray()) {
  console.log(ctx.cssSelectorOf(a), ctx.xpathOf(a));
}
```

### jsdom

```js
import { JSDOM } from "jsdom";
import { createSelectorContext } from "@dipanshuhandoo/domloc";

const { document } = new JSDOM(html).window;
const ctx = createSelectorContext(); // adapter "dom" is the default
ctx.cssSelectorOf(document.querySelector("a"));
```

### Playwright / Puppeteer (inject into the page)

```js
import { getBrowserScript } from "@dipanshuhandoo/domloc";

await page.evaluate(getBrowserScript()); // idempotent, defines window.domloc
const selectors = await page.evaluate(() => {
  const ctx = window.domloc.createSelectorContext({ attributes: ["data-testid"] });
  return [...document.querySelectorAll("a")].map((a) => ctx.cssSelectorOf(a));
});
```

### Browser `<script>`

```html
<script src="https://unpkg.com/@dipanshuhandoo/domloc/dist/browser/index.min.js"></script>
<script>
  const ctx = domloc.createSelectorContext();
  console.log(ctx.cssSelectorOf(document.activeElement));
</script>
```

### CommonJS

```js
const { createSelectorContext } = require("@dipanshuhandoo/domloc");
```

## Options

```js
createSelectorContext({
  adapter: "dom", // "dom" | "domhandler" | a custom adapter object
  classDenyList: DEFAULT_CLASS_DENY_LIST, // RegExp or string patterns; [] allows every class
  idDenyPattern: DEFAULT_ID_DENY_PATTERN, // ids matching this never anchor
  attributes: [], // e.g. ["data-testid", "name"]: unique values anchor the selector
});
ctx.xpathOf(node, { omitFirstIndex: true }); // "/html/body/main/div[2]" instead of "...[1]..."
```

Platform presets are option bundles. `presets.milo` restores the Adobe Milo deny-list:

```js
createSelectorContext({ adapter: "domhandler", ...presets.milo });
```

All options are described in [docs/configuration.md](docs/configuration.md).

## How a selector is built

The selector is built from the element up towards `body`. At each step the first matching rule
wins:

| #   | Rule                                                                  | Step                   | Stops the walk |
| --- | --------------------------------------------------------------------- | ---------------------- | -------------- |
| 1   | An `attributes` entry has a value unique in the document (opt-in)     | `[data-testid="save"]` | yes            |
| 2   | The `id` is unique in the document and does not look generated        | `#main`                | yes            |
| 3   | The **first** class is not deny-listed and no same-tag sibling has it | `div.card`             | no             |
| 4   | The tag is unique among its siblings                                  | `nav`                  | no             |
| 5   | Otherwise                                                             | `li:nth-of-type(3)`    | no             |

`html >` is omitted, so unanchored selectors start at `body`. Ids, classes and attribute values
are CSS-escaped. The XPath is always absolute and positional (`/html/body[1]/main[1]/a[2]`).
Details and the default deny-lists are in [docs/how-it-works.md](docs/how-it-works.md).

## Custom adapters

An adapter tells domloc how to walk your tree. To support another parser or a virtual tree,
implement `isElement`, `tagName`, `parent`, `children`, `id`, `classes` and `allElements`. See
[docs/adapters.md](docs/adapters.md).

```js
const ctx = createSelectorContext({ adapter: { ...domAdapter, id: () => "" } }); // ignore ids
```

## When to use something else

| Library                                                                      | Works on                                             | Approach                                                                        | Choose it when                                                                 |
| ---------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **domloc**                                                                   | Browser DOM, jsdom, Cheerio/domhandler, custom trees | Unique per step, no querying; one context per document                          | You need selectors for many elements, on the server or in the page, plus XPath |
| [`@medv/finder`](https://github.com/antonmedv/finder)                        | Browser DOM                                          | Searches for the shortest selector, checking candidates with `querySelectorAll` | You want the shortest possible selector for one element in a live page         |
| [`css-selector-generator`](https://github.com/fczbkk/css-selector-generator) | Browser DOM                                          | Combines selector types, verified against the document                          | You need fine control over which selector types are combined                   |
| [`@cypress/unique-selector`](https://github.com/cypress-io/unique-selector)  | Browser DOM                                          | Tries ID, class, attribute, tag and nth-child selectors in order                | You test with Cypress and want its conventions                                 |

domloc's selectors are deliberately positional where nothing better exists. They are readable
and stable for crawling and auditing the same HTML, but are usually longer than a shortest-path
generator's.

## Limitations

- Selectors describe the HTML you give them. Source HTML parsed by Cheerio can differ from the
  rendered DOM after scripts run, so a selector computed server-side may not match the live page.
- Positional steps (`:nth-of-type`) change when the page structure changes. Use `attributes`
  for stable test ids where you control the markup.
- Shadow DOM: selectors for elements inside a shadow root are relative to that root.
  `<template>` content and detached nodes produce relative selectors, and ids outside the
  document never anchor.
- XPaths in XML documents parsed by Cheerio's XML mode cannot address elements in a default
  `xmlns` namespace, because htmlparser2 records no namespaces. SVG, MathML and prefixed HTML
  tags resolve.
- css-select (Cheerio) cannot match camel-cased SVG tags such as `foreignObject` in HTML mode.
  domloc emits the browser-correct case.
- Write `attributes` names in lower case: HTML attribute names are case-insensitive in the DOM
  but stored lower-cased by Cheerio.
- A context caches results. Create a new one after mutating the document.

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [How it works](docs/how-it-works.md)
- [Adapters](docs/adapters.md)
- [Browser, Playwright and Puppeteer](docs/browser.md)
- [API reference](docs/api-reference.md)
- [Errors and messages](docs/errors-and-messages.md)
- [Performance](docs/performance.md)
- [FAQ](docs/faq.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Examples](examples/README.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers: see [MAINTAINING.md](MAINTAINING.md).
Security issues: see [SECURITY.md](SECURITY.md).

## License

MIT
