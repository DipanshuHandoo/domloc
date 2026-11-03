# FAQ

**Why are my selectors positional (`:nth-of-type`) instead of using classes?**
Only the **first** class is considered. It is skipped if it is deny-listed or if a sibling with
the same tag has it too. Check the [default deny-list](how-it-works.md#default-deny-lists).
Pass `classDenyList: []` to allow every class, or use `attributes` for stable hooks.

**Will a selector computed with Cheerio work in the browser?**
Yes, if the browser sees the same HTML. Scripts that add, remove or reorder elements after load
change positions and can invalidate it. For rendered pages, compute in the page with
[`getBrowserScript()`](browser.md).

**Can I get the shortest possible selector?**
No. domloc prefers predictable, readable, verification-free selectors over minimal ones. Use a
search-based generator such as `@medv/finder` in a live DOM if you need the shortest.

**Why do some XPath steps look like `*[local-name(.)='svg'][1]`?**
In HTML documents a plain name step only matches HTML elements, so SVG, MathML and prefixed tags
such as Word's `<o:p>` need a name-function step to resolve. Ordinary HTML steps keep the plain
format. See [How it works](how-it-works.md#xpath).

**Is there a default for Adobe sites?**
Use `presets.milo`. The defaults are generic and contain nothing platform-specific.

**Does it support shadow DOM?**
Partially. Inside a shadow root the selector is relative to that root, so query it with
`shadowRoot.querySelector`. Selectors that cross shadow boundaries are not produced.

**Is the output stable between versions?**
Changes to output for the same input and options are treated as breaking. They are released in
a major version, or in a minor version with a changelog entry under "Fixed" when the previous
output did not resolve.

## Security

domloc only reads the tree you give it and returns strings. It does not fetch, evaluate or
execute anything from the document. Ids, classes and attribute values are CSS-escaped. A
selector is still derived from page content, so escape it for the target context before putting
it into HTML, SQL or logs. `getBrowserScript()` returns a fixed string built from this package;
it contains no data from your options.
