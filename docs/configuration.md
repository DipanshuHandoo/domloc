# Configuration

`createSelectorContext(options)` accepts the options below; all are optional. The one-off
helpers `cssSelectorOf(node, options)` and `xpathOf(node, options)` accept the same options,
and `xpathOf` also accepts `omitFirstIndex`.

| Option          | Type                               | Default                   | Description                                                                                                                                  |
| --------------- | ---------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `adapter`       | `"dom" \| "domhandler" \| Adapter` | `"dom"`                   | How to read the tree. `"dom"` covers browsers and jsdom; `"domhandler"` covers Cheerio, htmlparser2 and parse5. See [Adapters](adapters.md). |
| `classDenyList` | `(RegExp \| string)[]`             | `DEFAULT_CLASS_DENY_LIST` | A node's **first** class is never used if it matches any pattern. `[]` allows every class.                                                   |
| `idDenyPattern` | `RegExp \| string`                 | `DEFAULT_ID_DENY_PATTERN` | Ids matching this pattern never anchor a selector.                                                                                           |
| `attributes`    | `string[]`                         | `[]`                      | Attribute names whose document-unique values anchor a selector, checked in order and before the id.                                          |

`xpathOf(node, { omitFirstIndex: true })` drops every `[1]` predicate:
`/html/body/main/div[2]/a` instead of `/html/body[1]/main[1]/div[2]/a[1]`.

Invalid options throw [`InvalidOptionError`](errors-and-messages.md) when the context is
created, never later.

## Patterns

Strings are compiled with `new RegExp(pattern)` and **no flags**. Use strings when options
cross a serialisation boundary such as `page.evaluate`. Use `RegExp` objects anywhere else. A
global (`g`) or sticky (`y`) flag is removed internally, so results never depend on call order.

```js
createSelectorContext({ classDenyList: ["^tmp-", /^state-/i], idDenyPattern: "^(ember|ext-)" });
```

To extend the defaults rather than replace them:

```js
import { DEFAULT_CLASS_DENY_LIST } from "@dipanshuhandoo/domloc";

createSelectorContext({ classDenyList: [...DEFAULT_CLASS_DENY_LIST, /^u-/] });
```

To allow every id, pass a pattern that never matches, such as `/(?!)/`. An empty string falls
back to the default.

## `attributes`

```js
const ctx = createSelectorContext({ attributes: ["data-testid", "data-qa", "name"] });
ctx.cssSelectorOf(button); // '[data-testid="checkout"]'
```

- A value anchors the selector only if exactly one element in the document has that value for
  that attribute. Empty values are ignored.
- Names are tried in order, and all of them before the id.
- Values are emitted as escaped, double-quoted CSS strings.
- Write names in lower case. HTML attribute names are case-insensitive in the DOM, but Cheerio
  stores them lower-cased, so `data-testId` would anchor in a browser and not in Cheerio.
- Values of HTML attributes that browsers compare case-insensitively (`type`, `lang`, `dir`,
  `rel`, ...) are counted without case. `data-*` values are case-sensitive.
- Custom adapters must implement `attribute` and `withAttribute` to use this option.

## Presets

`presets` holds frozen option bundles for specific site platforms. Spread one into the options:

```js
import { presets } from "@dipanshuhandoo/domloc";

createSelectorContext({ adapter: "domhandler", ...presets.milo });
```

| Preset         | For                                                  | Effect                                                                                                                                                                                                       |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `presets.milo` | Adobe Milo / Franklin (Edge Delivery Services) sites | Deny-lists runtime block decoration such as `con-block`, `has-bg`, `dark`, `grid` and `xs-spacing`, and uses the original id pattern. Reproduces the output of the internal `dom-selectors` package exactly. |

In a page, use `window.domloc.presets.milo`, because `RegExp` objects do not survive
`page.evaluate` serialisation.

## No global state

Options belong to the context. Contexts never share caches or state, so two contexts with
different options can be used on the same document.
