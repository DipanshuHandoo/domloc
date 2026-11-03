# API reference

Everything below is exported from `@dipanshuhandoo/domloc` (ESM and CommonJS). Other paths are
private.

## `createSelectorContext(options?): SelectorContext`

Creates a memoised context for one document. See [Configuration](configuration.md) for the
options. Throws `InvalidOptionError` for invalid options.

### `ctx.cssSelectorOf(node): string`

A readable CSS selector that matches exactly `node`. Returns `''` for anything that is not an
element.

### `ctx.xpathOf(node, { omitFirstIndex? }): string`

An absolute positional XPath such as `/html/body[1]/main[1]/a[2]`. Returns `''` for anything
that is not an element.

## `cssSelectorOf(node, options?)` / `xpathOf(node, options?)`

One-off helpers that create a throwaway context per call. `xpathOf` also accepts
`omitFirstIndex`. Use a context for more than a few nodes.

## `getBrowserScript(): string`

The minified browser bundle as a string. Evaluating it in a page defines `window.domloc` if the
global is absent. See [Browser](browser.md). If the package is used from its TypeScript sources
without a build, it throws `DomlocError` with code `ERR_BROWSER_SCRIPT_UNAVAILABLE`.

## `cssEscape(value): string`

`CSS.escape` per the CSSOM spec, for environments without a `CSS` global.

## Constants

| Export | Description |
| --- | --- |
| `DEFAULT_CLASS_DENY_LIST` | Frozen `RegExp[]` of generic state and generated class patterns |
| `DEFAULT_ID_DENY_PATTERN` | `RegExp` of generated-looking ids |
| `presets` | Frozen option bundles: `presets.milo` |
| `domAdapter` | Built-in adapter for browser DOM and jsdom |
| `domhandlerAdapter` | Built-in adapter for Cheerio / domhandler |

## Errors

`DomlocError` (base, with `code`), `InvalidOptionError`, and the guard
`isDomlocError(value)`. See [Errors and messages](errors-and-messages.md).

## Types

`Adapter<TNode>`, `AdapterName`, `SelectorContext`, `SelectorContextOptions<TNode>`,
`SelectorOptions`, `XPathOptions`, `Pattern`, `Preset`, `ErrorCode`, `DomElementLike`,
`DomhandlerNodeLike`.
