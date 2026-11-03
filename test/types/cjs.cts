// CommonJS consumer fixture: compiled against the installed tarball with module=nodenext.
import domloc = require("@dipanshuhandoo/domloc");

declare const element: Element;

const ctx: domloc.SelectorContext = domloc.createSelectorContext({ adapter: "domhandler" });
const css: string = ctx.cssSelectorOf(element);
const xpath: string = domloc.xpathOf(element, { omitFirstIndex: true });
const options: domloc.SelectorContextOptions = { ...domloc.presets.milo, attributes: ["name"] };
const script: string = domloc.getBrowserScript();

declare const error: unknown;
if (domloc.isDomlocError(error)) {
  const code: domloc.ErrorCode = error.code;
  void code;
}
void [css, xpath, options, script];
