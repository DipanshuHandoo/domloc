import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { fail, log, readConfig, readPackage, root, runBin } from "./lib/util.mjs";

const config = readConfig();
const pkg = readPackage();
const dist = path.join(root, "dist");
const ext = config.language === "js" ? "js" : "ts";

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...Object.keys(pkg.optionalDependencies ?? {}),
];

const entryPoints = Object.fromEntries(
  Object.entries(config.entries).map(([name, source]) => [
    name,
    path.join(root, `${source}.${ext}`),
  ]),
);

const common = {
  absWorkingDir: root,
  bundle: true,
  sourcemap: true,
  legalComments: "none",
  logLevel: "warning",
};

function bundle(options) {
  return Promise.all(
    [false, true].map((minify) =>
      build({
        ...common,
        entryPoints,
        ...options,
        minify,
        entryNames: minify ? "[name].min" : "[name]",
      }),
    ),
  );
}

/** Builds the IIFE that defines the page global and returns its minified source. */
async function buildBrowserScript() {
  const outdir = path.join(dist, "browser");
  await bundle({
    entryPoints: { index: path.join(root, `${config.browserEntry}.${ext}`) },
    format: "iife",
    platform: "browser",
    target: config.browserTarget,
    outdir,
  });
  return readFileSync(path.join(outdir, "index.min.js"), "utf8")
    .replace(/\n\/\/# sourceMappingURL=.*\s*$/, "")
    .trim();
}

async function main() {
  rmSync(dist, { recursive: true, force: true });

  log("Bundling the browser script (IIFE)");
  const browserScript = await buildBrowserScript();
  const define = { __DOMLOC_BROWSER_SCRIPT__: JSON.stringify(browserScript) };

  log("Bundling ESM and CommonJS builds");
  await Promise.all([
    bundle({
      format: "esm",
      platform: "node",
      target: config.nodeTarget,
      outdir: path.join(dist, "esm"),
      external,
      define,
    }),
    bundle({
      format: "cjs",
      platform: "node",
      target: config.nodeTarget,
      outdir: path.join(dist, "cjs"),
      external,
      define,
    }),
  ]);
  writeFileSync(
    path.join(dist, "cjs", "package.json"),
    `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
  );

  log("Generating type declarations");
  await runBin("typescript", "tsc", ["-p", "tsconfig.build.json"]);

  // CommonJS consumers need declarations that resolve under the commonjs package marker.
  const copyDeclarations = (from, to) => {
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      const source = path.join(from, entry.name);
      if (entry.isDirectory()) copyDeclarations(source, path.join(to, entry.name));
      else if (entry.name.endsWith(".d.ts")) cpSync(source, path.join(to, entry.name));
    }
  };
  copyDeclarations(path.join(dist, "esm"), path.join(dist, "cjs"));

  console.log(
    `Build complete: dist/esm, dist/cjs, dist/browser (browser script ${(browserScript.length / 1024).toFixed(1)} kB)`,
  );
}

main().catch((error) => fail(error));
