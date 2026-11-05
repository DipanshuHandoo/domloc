import { runNode, readConfig, sourceExtension, fail } from "./lib/util.mjs";

const coverage = process.argv.includes("--coverage");
const config = readConfig();
const ext = sourceExtension();

const args = ["--test"];
if (coverage) {
  args.push(
    "--experimental-test-coverage",
    "--test-coverage-include=src/**",
    `--test-coverage-lines=${config.coverage.lines}`,
    `--test-coverage-branches=${config.coverage.branches}`,
    `--test-coverage-functions=${config.coverage.functions}`,
  );
}
args.push(`test/**/*.test.${ext}`);

const env = coverage ? { ...process.env, DOMLOC_COVERAGE: "1" } : process.env;

runNode(args, { env }).catch((error) => fail(error));
