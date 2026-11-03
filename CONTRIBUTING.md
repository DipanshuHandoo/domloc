# Contributing

## Setup

```sh
npm ci
```

Requires Node.js >= 22.18.0 (see `.nvmrc`). The browser check and `examples/playwright.mjs` need
Chromium once: `npx playwright install chromium`.

## Workflow

1. Branch from `main`.
2. Make the change with tests. Test public behavior, error paths and cleanup. Follow the layout
   and dependency rules in `ARCHITECTURE.md`. Selector and XPath output for existing input is a
   compatibility contract: change it only with a failing test first and a changeset entry.
3. Run `npm run verify` (clean, typecheck, lint, format check, coverage, build, packed-package
   checks, Chromium check). It must pass before opening a PR.
4. Add a changeset for user-facing changes: `npm run changeset`.
5. Update docs and examples when the public API changes.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm test` | Run tests |
| `npm run test:coverage` | Tests with coverage thresholds |
| `npm run format` | Apply formatting |
| `npm run lint` | Lint (warnings fail) |
| `npm run typecheck` | Type check |
| `npm run build` | Build `dist/` |
| `npm run test:package` | Pack, install in a temp project, test ESM/CJS/types/examples |
| `npm run test:browser` | Run the built browser bundle and `getBrowserScript()` in Chromium |
| `npm run verify` | Everything CI runs |

`src/browser.ts` is the entry for the browser bundle. `scripts/build.mjs` builds it first and
embeds the minified output into the ESM/CJS builds as the `getBrowserScript()` return value.
Tests that run the TypeScript sources get it from `provideBrowserScript()` in `test/helpers.ts`.

Do not edit `dist/` by hand and do not publish locally; releases are manual workflow runs
(see `MAINTAINING.md`).
