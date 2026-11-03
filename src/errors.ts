export type ErrorCode = "ERR_INVALID_OPTION" | "ERR_BROWSER_SCRIPT_UNAVAILABLE";

export class DomlocError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export class InvalidOptionError extends DomlocError {
  constructor(message: string, options?: ErrorOptions) {
    super("ERR_INVALID_OPTION", message, options);
  }
}

export function isDomlocError(value: unknown): value is DomlocError {
  return value instanceof DomlocError;
}
