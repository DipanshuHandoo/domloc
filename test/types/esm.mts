// ESM consumer fixture: compiled against the installed tarball with module=nodenext.
import {
  type Adapter,
  createSelectorContext,
  cssEscape,
  cssSelectorOf,
  DEFAULT_CLASS_DENY_LIST,
  DEFAULT_ID_DENY_PATTERN,
  type DomElementLike,
  domAdapter,
  domhandlerAdapter,
  type ErrorCode,
  getBrowserScript,
  InvalidOptionError,
  isDomlocError,
  presets,
  type SelectorContext,
  type SelectorContextOptions,
  xpathOf,
} from "@dipanshuhandoo/domloc";

declare const element: Element;

const ctx: SelectorContext = createSelectorContext({ adapter: "dom", attributes: ["data-testid"] });
const css: string = ctx.cssSelectorOf(element);
const xpath: string = ctx.xpathOf(element, { omitFirstIndex: true });
const oneOff: string = cssSelectorOf(element, { ...presets.milo, adapter: "domhandler" });
const oneOffXPath: string = xpathOf(element, { omitFirstIndex: true });
const script: string = getBrowserScript();
const escaped: string = cssEscape("a.b");
const patterns: readonly RegExp[] = DEFAULT_CLASS_DENY_LIST;
const idPattern: RegExp = DEFAULT_ID_DENY_PATTERN;
const domNode: DomElementLike = element;

interface MyNode {
  name: string;
  up: MyNode | null;
  kids: MyNode[];
}
const custom: Adapter<MyNode> = {
  isElement: (n: unknown): n is MyNode => typeof (n as MyNode)?.name === "string",
  tagName: (n) => n.name,
  parent: (n) => n.up,
  children: (n) => n.kids,
  id: () => "",
  classes: () => [],
  allElements: () => [],
};
const options: SelectorContextOptions<MyNode> = { adapter: custom, classDenyList: ["^x", /y/] };
createSelectorContext(options);
// @ts-expect-error unknown adapter names are rejected at compile time
createSelectorContext({ adapter: "cheerio" });

declare const error: unknown;
if (isDomlocError(error)) {
  const code: ErrorCode = error.code;
  void code;
}
void [css, xpath, oneOff, oneOffXPath, script, escaped, patterns, idPattern, domNode];
void [domAdapter, domhandlerAdapter, InvalidOptionError];
