# Changelog

## 2.0.3

### Patch Changes

- 53c1349: performance fix

## 2.0.2

### Patch Changes

- f057bb5: Local Release

## 2.0.1

### Patch Changes

- 1509cff: setting github actions
- 4abfe71: version fix

## 2.0.0

### Major Changes

- a579086: First public release of `domloc`, the generic successor of the internal `dom-selectors` package.
  It returns a readable, unique CSS selector and an absolute XPath for any element, with one
  algorithm for the browser, jsdom and Cheerio.
  
  ### Added
  
  - Dual ESM/CommonJS builds with TypeScript declarations, plus a browser bundle
    (`dist/browser/index.min.js`) that defines `window.domloc`.
  - `attributes` option (off by default): a document-unique value of an attribute such as
    `data-testid` anchors the selector as `[data-testid="value"]`.
  - `presets.milo` reproduces the previous Adobe Milo deny-list and id pattern exactly.
  - Exported `domAdapter` and `domhandlerAdapter`, optional `selectorName`, `quirksMode` and
    `namespace` adapter methods, and the `DomlocError` / `InvalidOptionError` error contract with
    stable codes.
  - Option validation: unknown adapters, adapters missing methods, invalid patterns and invalid
    attribute names throw `InvalidOptionError`.
  
  ### Changed
  
  - The default class deny-list is now generic. It skips runtime state classes, `is-`/`has-`/`no-`/`js-`
    prefixes, classes starting with a digit, CSS-in-JS and framework classes (emotion,
    styled-components, styled-jsx, Svelte, Angular), CSS Modules hashes and long hash tokens.
    Milo-specific classes such as `con-block` or `xs-spacing` are no longer denied by default; use
    `presets.milo` for the previous output.
  - The default id deny pattern also skips React `useId` values (`:r1:`, `«r1»`, `_r_1_`).
  - `getBrowserScript()` now returns a prebuilt bundle that defines `window.domloc` instead of
    `window.__domSelectors`. The in-page API matches the package exports (except
    `getBrowserScript`).
  - Requires Node.js >= 22.18.0.
  
  ### Fixed
  
  - CSS selectors keep the case of SVG, MathML and XML tag names (for example `foreignObject`),
    so they resolve in case-sensitive engines such as jsdom and in Cheerio XML documents.
  - XPaths now resolve through SVG/MathML elements, prefixed or unusual tags (`<o:p>`) and
    case-sensitive XML. Those steps use `*[local-name(.)='name'][n]`, `*[name(.)='ns:name'][n]` or
    the case-preserved name. Previously such paths matched nothing, or threw a `NamespaceError`
    for `o:p`. Steps for ordinary HTML elements are unchanged.
  - Tag names are CSS-escaped. Prefixed or unusual tags such as Word's `<o:p>`, `<fb:like>` or
    `<x.y>` previously produced selectors that matched nothing or threw.
  - Siblings are grouped by case-sensitive name, so `:nth-of-type` indexes are correct when XML
    siblings differ only in case (`<Item>` / `<item>`).
  - The DOM adapter keeps tag case in XML documents parsed with `DOMParser`.
  - Quirks-mode documents (no doctype): classes and ids that differ only in case are no longer
    treated as unique, because browsers match them case-insensitively there.
  - Class attributes are split on ASCII whitespace only, as in HTML. A class containing a
    non-breaking space is no longer split into two classes.
  - With the `attributes` option, values of HTML attributes that browsers compare
    case-insensitively (`type`, `lang`, `dir`, ...) are counted without case.
  - Only a root `<html>` element ends the selector walk. A nested `<html>` in XML no longer
    produces non-unique selectors.
  - Global or sticky RegExp deny patterns no longer give results that depend on call order.
- 1d2ef6c: Initial Release
