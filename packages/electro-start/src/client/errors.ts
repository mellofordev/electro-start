/**
 * MainFnError — thrown in the webview when a main fn rejects, and usable
 * inside main fns to attach a structured `data` payload that survives the
 * bridge. Dependency-free: safe to import from both sides.
 */

import type { SerializedError } from "../serialize.ts";

export class MainFnError extends Error {
  /** Structured payload attached on the bun side, preserved across the bridge. */
  data?: unknown;
  /** The main-fn id this error came from (set by the client stub). */
  mainFnId?: string;

  constructor(message: string, options?: { data?: unknown; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "MainFnError";
    this.data = options?.data;
  }

  static fromSerialized(id: string, error: SerializedError): MainFnError {
    const err = new MainFnError(error.message, { data: error.data });
    err.name = error.name === "Error" ? "MainFnError" : error.name;
    err.mainFnId = id;
    if (error.stack) {
      // Keep the bun-side stack visible under the client stack for debugging.
      err.stack = `${err.stack}\n    --- main process ---\n${error.stack}`;
    }
    return err;
  }
}
