/** `CSS.escape` per the CSSOM spec, for environments without a `CSS` global (Node, Cheerio). */
export function cssEscape(value: unknown): string {
  const string = String(value);
  const length = string.length;
  const first = string.charCodeAt(0);
  let result = "";
  if (length === 1 && first === 0x2d) return `\\${string}`;
  for (let i = 0; i < length; i += 1) {
    const c = string.charCodeAt(i);
    if (c === 0) {
      result += "\uFFFD";
    } else if (
      (c >= 0x01 && c <= 0x1f) ||
      c === 0x7f ||
      (i === 0 && c >= 0x30 && c <= 0x39) ||
      (i === 1 && c >= 0x30 && c <= 0x39 && first === 0x2d)
    ) {
      result += `\\${c.toString(16)} `;
    } else if (
      c >= 0x80 ||
      c === 0x2d ||
      c === 0x5f ||
      (c >= 0x30 && c <= 0x39) ||
      (c >= 0x41 && c <= 0x5a) ||
      (c >= 0x61 && c <= 0x7a)
    ) {
      result += string.charAt(i);
    } else {
      result += `\\${string.charAt(i)}`;
    }
  }
  return result;
}

/** A double-quoted CSS string per the CSSOM "serialize a string" algorithm. */
export function cssString(value: string): string {
  let result = '"';
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    if (c === 0) result += "\uFFFD";
    else if ((c >= 0x01 && c <= 0x1f) || c === 0x7f) result += `\\${c.toString(16)} `;
    else if (c === 0x22 || c === 0x5c) result += `\\${value.charAt(i)}`;
    else result += value.charAt(i);
  }
  return `${result}"`;
}
