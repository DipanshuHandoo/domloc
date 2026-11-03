# Performance

## Cost model

For a context over a document with _N_ elements:

- The first id anchor check scans every element with an id once (`allElements`). Each listed
  attribute is scanned once in the same way.
- Each parent's children are grouped by element name once, when the first child is visited.
- Every computed selector and XPath prefix is cached per element. The second link in the same
  list costs a single step.

Generating selectors for all _N_ elements is therefore roughly linear in _N_. It never calls
`querySelectorAll` to verify candidates, which is what makes search-based generators expensive
on large pages.

The test suite includes a budget test: a page of about 5,000 elements with 1,000 links must take
less than 250 ms for both selectors and XPaths in jsdom. It runs locally and is skipped in CI
because shared runners give noisy timings (set `DOMLOC_PERF=1` to force it).

### Measured

Selector plus XPath for every element of a 160,000-element page (20,000 repeated sections, one
context), on Node 22 with a typical laptop CPU. These are indicative; measure your own pages.

| Workload | Time |
| --- | --- |
| Cheerio, all 160k elements | ~0.3 s (~2 µs per element) |
| jsdom, all 160k elements | ~0.75 s (DOM accessors dominate) |
| Cheerio, one-off `cssSelectorOf` per link | ~15 ms **per call** |

The one-off helpers are O(document) per call. Each call builds a new context, which scans every
id in the document and regroups the target's siblings. On large pages that is thousands of times
slower than reusing a context.

## Guidance for large workloads

- **Reuse one context per document.** Never call the one-off helpers in a loop.
- **Do not share a context between documents.** Each document needs its own uniqueness maps.
- **Many documents:** the work is CPU-bound and synchronous. When processing thousands of pages
  in Node, parallelise across documents with a bounded pool of worker threads or processes, each
  parsing and generating independently. Avoid `Promise.all` over thousands of documents in one
  thread: it does not add parallelism and keeps every parsed tree in memory at once.
- **Memory:** caches are `WeakMap`s keyed by node, so they are released with the document. Drop
  references to the context and the parsed tree once a page is done.
- **In the browser:** compute everything for a page in one `page.evaluate` call and return plain
  strings, instead of one round trip per element.
