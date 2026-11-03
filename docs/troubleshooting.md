# Troubleshooting

**`InvalidOptionError: Unknown adapter: cheerio`**: the built-in names are `"dom"` and
`"domhandler"`. Use `"domhandler"` for Cheerio.

**Every selector is `''`**: the node is not an element for the chosen adapter. Common causes are
passing a Cheerio node with the default `"dom"` adapter, passing a Cheerio wrapper (`$("a")`)
instead of a node (`$("a")[0]` or `.toArray()`), or passing a text node.

**A selector matches nothing in the live page**: the HTML differs from what you parsed, for
example because of client-side rendering, A/B tests or consent banners. Compute the selector in
the page instead, and create a new context after the DOM changes.

**A selector matched yesterday and not today**: positional steps follow structure. Prefer
`attributes: ["data-testid"]` on markup you control, and add generated classes to
`classDenyList`.

**`page.evaluate`: my RegExp option is ignored or throws**: RegExps do not serialise. Pass
strings, or use `window.domloc.presets` inside the page. See [Browser](browser.md).

**jsdom: `RangeError: Selector exceeds maximum allowed length`**: jsdom limits selectors to 2048
characters, which only extremely deep, unanchored trees reach. Browsers have no such limit.

**`ERR_REQUIRE_ESM` or "Cannot use import statement"**: use `import` for ESM and `require` for
CommonJS. Both resolve through the package `exports` map.

**TypeScript cannot find the types**: use `moduleResolution` `node16`, `nodenext` or
`bundler`. Legacy `node10` resolution is not supported.
