# Errors and messages

Every error that domloc throws on purpose extends `DomlocError` and has a stable `code`. Branch
on `code` or `instanceof`, never on the message text.

| Class                | `code`                           | When                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InvalidOptionError` | `ERR_INVALID_OPTION`             | `createSelectorContext` (or a one-off helper) received an unknown adapter name, an adapter missing required methods, a non-array `classDenyList`/`attributes`, a pattern that is neither `RegExp` nor string, an invalid pattern string (`cause` is the `SyntaxError`), or an empty attribute name |
| `DomlocError`        | `ERR_BROWSER_SCRIPT_UNAVAILABLE` | `getBrowserScript()` was called from unbuilt sources (only relevant when developing domloc itself)                                                                                                                                                                                                 |

```js
import { createSelectorContext, isDomlocError } from "@dipanshuhandoo/domloc";

try {
  createSelectorContext({ adapter: userInput });
} catch (error) {
  if (isDomlocError(error) && error.code === "ERR_INVALID_OPTION") {
    // report a configuration problem
  } else {
    throw error;
  }
}
```

Generating selectors never throws for well-formed adapters. Non-elements give `''`. Exceptions
thrown by a custom adapter propagate unchanged.
