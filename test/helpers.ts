import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";

export const FIXTURE = `<!doctype html><html><head><title>t</title></head><body>
  <header id="gnav"><nav><a href="/a">A</a><a href="/b">B</a></nav></header>
  <main id="main-content">
    <div class="section"><div class="marquee dark con-block"><div><div><h1>Hello</h1><p><a href="/x">x</a> <a href="/y">y</a></p></div></div></div></div>
    <div class="section"><div class="text"><p>one</p><p>two <a href="/z">z</a></p></div><div class="text"><p>three</p></div></div>
    <div class="section"><div class="card has-bg"><span>1</span></div><div class="card has-bg"><span>2</span></div></div>
    <div class="section" id="12345678"><a href="/gen">generated id</a></div>
    <div id="dup"><a href="/d1">d1</a></div><div id="dup"><a href="/d2">d2</a></div>
    <div id="we:ird.id"><a href="/e">e</a></div>
  </main>
  <footer><ul><li><a href="/f1">f1</a></li><li><a href="/f2">f2</a></li></ul></footer>
</body></html>`;

type DomNode = Element;
interface CheerioNode {
  type: string;
  name: string;
  parent: CheerioNode | null;
  prev: CheerioNode | null;
}

// Reference implementations copied from the builders this library replaces.
export const legacyLinksXpath = (el: DomNode): string => {
  const parts: string[] = [];
  for (let node: DomNode | null = el; node && node.nodeType === 1; node = node.parentElement) {
    const tag = node.nodeName.toLowerCase();
    if (tag === "html") {
      parts.unshift("html");
      break;
    }
    let index = 1;
    for (let s = node.previousElementSibling; s; s = s.previousElementSibling) {
      if (s.nodeName === node.nodeName) index += 1;
    }
    parts.unshift(`${tag}[${index}]`);
  }
  return `/${parts.join("/")}`;
};

export const legacyFragmentXpath = (el: DomNode): string => {
  const parts: string[] = [];
  let node: DomNode | null = el;
  while (node && node.nodeType === 1) {
    let index = 1;
    let sibling = node.previousSibling;
    while (sibling) {
      if (sibling.nodeType === 1 && sibling.nodeName === node.nodeName) index += 1;
      sibling = sibling.previousSibling;
    }
    const predicate = index > 1 ? `[${index}]` : "";
    parts.unshift(`${node.nodeName.toLowerCase()}${predicate}`);
    node = node.parentElement;
  }
  return `/${parts.join("/")}`;
};

export const legacyCheerioXpath = (el: CheerioNode): string => {
  const parts: string[] = [];
  for (let node: CheerioNode | null = el; node && node.type === "tag"; node = node.parent) {
    const tag = node.name.toLowerCase();
    if (tag === "html") {
      parts.unshift("html");
      break;
    }
    let index = 1;
    for (let s = node.prev; s; s = s.prev) {
      if (s.type === "tag" && s.name === node.name) index += 1;
    }
    parts.unshift(`${tag}[${index}]`);
  }
  return `/${parts.join("/")}`;
};

export const makeDom = (html = FIXTURE): Document => new JSDOM(html).window.document;
export const allElements = (doc: Document | Element): Element[] =>
  Array.from(doc.querySelectorAll("*"));

/** First node returned by an XPath expression, or null. */
export const evaluateXPath = (doc: Document, xpath: string): Node | null =>
  doc.evaluate(xpath, doc, null, 9, null).singleNodeValue;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Builds src/browser.ts the way scripts/build.mjs does and returns the IIFE source. */
export async function buildBrowserScript(): Promise<string> {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [path.join(root, "src", "browser.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    write: false,
    logLevel: "silent",
  });
  return (result.outputFiles[0] as { text: string }).text;
}

/** Makes getBrowserScript() usable from the TypeScript sources, as the build does via `define`. */
export async function provideBrowserScript(): Promise<string> {
  const script = await buildBrowserScript();
  (globalThis as { __DOMLOC_BROWSER_SCRIPT__?: string }).__DOMLOC_BROWSER_SCRIPT__ = script;
  return script;
}

export function clearBrowserScript(): void {
  delete (globalThis as { __DOMLOC_BROWSER_SCRIPT__?: string }).__DOMLOC_BROWSER_SCRIPT__;
}
