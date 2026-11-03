import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";
import { fail, readPackage, root } from "./lib/util.mjs";

const pkg = readPackage();
const GLOBAL = "domloc";

const FIXTURE = `<!doctype html><html><head><title>t</title></head><body>
  <header id="gnav"><nav><a href="/a">A</a><a href="/b">B</a></nav></header>
  <main id="main-content">
    <div class="section"><div class="marquee con-block"><p><a href="/x">x</a> <a href="/y">y</a></p></div></div>
    <div class="section"><div class="card is-open"><span>1</span></div><div class="card"><span>2</span></div></div>
    <div id="we:ird.id"><button data-testid="save">s</button><button data-testid="dup">d</button><button data-testid="dup">d</button></div>
    <div id="dup"></div><div id="dup"></div><div id=":r1:"><a href="/r">r</a></div>
    <svg><foreignObject><p>in svg</p></foreignObject><foreignObject></foreignObject><linearGradient></linearGradient></svg>
    <my-card><x-slot></x-slot></my-card>
  </main>
  <footer><ul><li><a href="/f1">f1</a></li><li><a href="/f2">f2</a></li></ul></footer>
</body></html>`;

/** Runs in the page: every selector/XPath must resolve to exactly its element. */
function auditPage({ name, options }) {
  const api = window[name];
  const ctx = api.createSelectorContext(options);
  const problems = [];
  const results = [];
  for (const el of document.querySelectorAll(":not(script)")) {
    const selector = ctx.cssSelectorOf(el);
    const xpath = ctx.xpathOf(el);
    results.push([selector, xpath]);
    const hits = document.querySelectorAll(selector);
    if (hits.length !== 1 || hits[0] !== el) problems.push(`css ${selector} -> ${hits.length}`);
    const hit = document.evaluate(xpath, document, null, 9, null).singleNodeValue;
    if (hit !== el) problems.push(`xpath ${xpath}`);
  }
  return { problems, results };
}

async function main() {
  const esm = await import(pathToFileURL(path.join(root, "dist", "esm", "index.js")).href);
  const expected = Object.keys(esm)
    .filter((key) => key !== "getBrowserScript")
    .sort();
  const script = esm.getBrowserScript();

  const node = (options) => {
    const doc = new JSDOM(FIXTURE).window.document;
    const ctx = esm.createSelectorContext(options);
    return Array.from(doc.querySelectorAll(":not(script)")).map((el) => [
      ctx.cssSelectorOf(el),
      ctx.xpathOf(el),
    ]);
  };
  const scenarios = [
    { label: "defaults", options: {} },
    {
      label: "string patterns + attributes",
      options: {
        classDenyList: ["^marquee$"],
        idDenyPattern: "^gnav$",
        attributes: ["data-testid"],
      },
    },
  ];

  // No doctype: quirks mode, where Chromium matches classes and ids case-insensitively.
  const QUIRKS = `<html><body><p class="Card">a<o:p></o:p></p><p class="card"></p>
    <div id="Main"><i></i></div><div id="main"><fb:like></fb:like><fb:like></fb:like></div>
    <input type="text"><input type="TEXT"></body></html>`;

  const browser = await chromium.launch();
  try {
    {
      const page = await browser.newPage();
      await page.setContent(QUIRKS);
      await page.evaluate(script);
      const mode = await page.evaluate(() => document.compatMode);
      if (mode !== "BackCompat") throw new Error(`quirks fixture is in ${mode}`);
      const { problems } = await page.evaluate(auditPage, {
        name: GLOBAL,
        options: { attributes: ["type"] },
      });
      if (problems.length) throw new Error(`quirks page: unresolved:\n  ${problems.join("\n  ")}`);
      await page.close();
      console.log(`Browser check ok: quirks mode, prefixed tags, case-insensitive attributes`);
    }
    const sources = [
      {
        label: "dist/browser/index.js",
        tag: { path: path.join(root, "dist", "browser", "index.js") },
      },
      {
        label: "dist/browser/index.min.js",
        tag: { path: path.join(root, "dist", "browser", "index.min.js") },
      },
      { label: "getBrowserScript() x2", tag: { content: script }, twice: true },
    ];
    for (const source of sources) {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await page.setContent(FIXTURE);
      await page.addScriptTag(source.tag);
      if (source.twice) {
        const first = await page.evaluateHandle((name) => window[name], GLOBAL);
        await page.evaluate(script);
        const same = await page.evaluate(([a, name]) => a === window[name], [first, GLOBAL]);
        if (!same) throw new Error(`${source.label}: re-evaluating replaced window.${GLOBAL}`);
      }

      const keys = await page.evaluate((name) => Object.keys(window[name] ?? {}).sort(), GLOBAL);
      if (JSON.stringify(keys) !== JSON.stringify(expected)) {
        throw new Error(
          `${source.label}: window.${GLOBAL} exports [${keys}] differ from [${expected}]`,
        );
      }

      for (const { label, options } of scenarios) {
        const { problems, results } = await page.evaluate(auditPage, { name: GLOBAL, options });
        if (problems.length) {
          throw new Error(`${source.label} (${label}): unresolved:\n  ${problems.join("\n  ")}`);
        }
        const expectedResults = node(options);
        const index = results.findIndex(
          (r, i) => JSON.stringify(r) !== JSON.stringify(expectedResults[i]),
        );
        if (index !== -1 || results.length !== expectedResults.length) {
          throw new Error(
            `${source.label} (${label}): Chromium output differs from Node/jsdom at element ${index}: ` +
              `${JSON.stringify(results[index])} vs ${JSON.stringify(expectedResults[index])}`,
          );
        }
      }

      const milo = await page.evaluate((name) => {
        const api = window[name];
        return api
          .createSelectorContext(api.presets.milo)
          .cssSelectorOf(document.querySelector(".marquee"));
      }, GLOBAL);
      if (milo !== "#main-content > div:nth-of-type(1) > div.marquee") {
        throw new Error(`${source.label}: in-page milo preset returned "${milo}"`);
      }

      if (pageErrors.length)
        throw new Error(`${source.label}: page errors: ${pageErrors.join("; ")}`);
      await page.close();
      console.log(`Browser check ok: ${source.label} (${pkg.name})`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => fail(error));
