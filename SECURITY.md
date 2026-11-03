# Security policy

## Supported versions

Only the latest published minor version receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report privately through
[GitHub security advisories](https://github.com/DipanshuHandoo/domloc/security/advisories/new).
Include affected versions, a reproduction and the impact. You will get an acknowledgement within
a few days.

## Supply-chain controls

Releases are published from GitHub Actions with npm provenance, so each version can be traced
to the commit and workflow that built it. The package has no runtime dependencies.

## Scope

domloc reads the tree it is given and returns strings. It never fetches, evaluates or executes
document content. Ids, classes and attribute values are CSS-escaped in selectors. Selectors and
XPaths still come from untrusted page content, so escape them for any HTML, SQL or shell context
you place them in. `getBrowserScript()` returns a fixed script built from this package's own
sources.
