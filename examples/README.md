# Examples

Runnable examples that import the package through its public entry point. They are not
published to npm.

| File | Shows |
| --- | --- |
| `basic.mjs` | Minimal jsdom usage: one context, selector and XPath per link |
| `full-tour.mjs` | Defaults, `attributes`, deny-lists, `presets.milo`, one-off helpers, errors, CommonJS |
| `cheerio.mjs` | Server-side scraping with Cheerio, with each selector resolved back |
| `playwright.mjs` | Injecting `getBrowserScript()` into a Chromium page and computing selectors in-page |
| `custom-adapter.mjs` | A custom adapter over a JSON tree, and wrapping a built-in adapter |

Each example asserts its own output, so a non-zero exit means broken behaviour.

## Dependencies

The examples use `jsdom`, `cheerio` and `playwright`. These are example-only dependencies, not
dependencies of the library. They are listed under `exampleDependencies` in
`boilerplate.config.json` and installed next to the tarball during `npm run test:package`.
`playwright.mjs` needs Chromium: run `npx playwright install chromium` once.

## Running

`npm run test:package` packs the library, installs the tarball and the example dependencies into
an isolated temporary project, and runs every `examples/*.mjs` file there. Files starting with
`_` are helpers and are not run. This is the supported way to run the examples.

To run one by hand:

```sh
npm run build && npm pack
mkdir /tmp/try && cd /tmp/try && npm init -y
npm i /path/to/dipanshuhandoo-domloc-x.y.z.tgz jsdom cheerio playwright
cp /path/to/repo/examples/basic.mjs . && node basic.mjs
```

Examples must not need secrets or live third-party services.
