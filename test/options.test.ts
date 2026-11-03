import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createSelectorContext,
  DomlocError,
  domAdapter,
  InvalidOptionError,
  isDomlocError,
} from "../src/index.ts";

const invalid = (fn: () => unknown, pattern: RegExp) =>
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof InvalidOptionError);
    assert.ok(isDomlocError(error));
    assert.equal(error.code, "ERR_INVALID_OPTION");
    assert.equal(error.name, "InvalidOptionError");
    assert.match(error.message, pattern);
    return true;
  });

describe("options validation", () => {
  it("rejects unknown adapter names and non-object adapters", () => {
    invalid(
      () => createSelectorContext({ adapter: "cheerio" as never }),
      /Unknown adapter: cheerio/,
    );
    invalid(() => createSelectorContext({ adapter: "toString" as never }), /Unknown adapter/);
    invalid(() => createSelectorContext({ adapter: 42 as never }), /Unknown adapter: 42/);
    invalid(() => createSelectorContext({ adapter: null as never }), /Unknown adapter: null/);
  });

  it("lists missing adapter methods", () => {
    invalid(
      () => createSelectorContext({ adapter: { isElement: () => true } as never }),
      /missing method\(s\): tagName, parent, children, id, classes, allElements$/,
    );
    const { attribute: _a, withAttribute: _w, ...basic } = domAdapter;
    assert.doesNotThrow(() => createSelectorContext({ adapter: basic }));
    invalid(
      () => createSelectorContext({ adapter: basic, attributes: ["data-testid"] }),
      /attribute, withAttribute \(required by the attributes option\)/,
    );
  });

  it("validates pattern options", () => {
    invalid(
      () => createSelectorContext({ classDenyList: "x" as never }),
      /classDenyList must be an array/,
    );
    invalid(
      () => createSelectorContext({ classDenyList: [1 as never] }),
      /entries must be RegExp or string, received number/,
    );
    invalid(() => createSelectorContext({ idDenyPattern: {} as never }), /idDenyPattern entries/);
    assert.throws(
      () => createSelectorContext({ classDenyList: ["("] }),
      (error: unknown) =>
        error instanceof InvalidOptionError &&
        /invalid pattern: \(/.test(error.message) &&
        error.cause instanceof SyntaxError,
    );
  });

  it("validates attribute names", () => {
    invalid(
      () => createSelectorContext({ attributes: "data-testid" as never }),
      /attributes must be an array/,
    );
    invalid(() => createSelectorContext({ attributes: [""] }), /non-empty attribute names/);
    invalid(() => createSelectorContext({ attributes: [" "] }), /non-empty attribute names/);
    invalid(() => createSelectorContext({ attributes: [1 as never] }), /non-empty attribute names/);
  });

  it("treats null and undefined options as defaults", () => {
    assert.doesNotThrow(() => createSelectorContext(undefined));
    assert.doesNotThrow(() => createSelectorContext(null as never));
    assert.doesNotThrow(() =>
      createSelectorContext({ classDenyList: null as never, attributes: null as never }),
    );
  });
});

describe("errors", () => {
  it("DomlocError carries a code and cause", () => {
    const cause = new Error("root");
    const error = new DomlocError("ERR_BROWSER_SCRIPT_UNAVAILABLE", "nope", { cause });
    assert.equal(error.name, "DomlocError");
    assert.equal(error.code, "ERR_BROWSER_SCRIPT_UNAVAILABLE");
    assert.equal(error.cause, cause);
    assert.ok(isDomlocError(error));
    assert.ok(!isDomlocError(cause));
  });
});
