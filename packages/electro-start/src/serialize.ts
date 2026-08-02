/**
 * Wire format for main-fn calls. Safe to import from BOTH sides.
 *
 * Everything crossing the bun <-> webview bridge is a superjson string, so
 * Dates, Maps, Sets, BigInts, undefined, etc. survive the round trip.
 *
 * Electrobun's RPC layer only forwards `error.message` on a rejected request,
 * so main-fn errors are never surfaced as RPC failures — instead every call
 * resolves with a ResultEnvelope that encodes success or a structured error.
 */

import superjson from "superjson";

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  /** Extra payload carried by MainFnError, preserved across the bridge. */
  data?: unknown;
}

export type ResultEnvelope =
  | { ok: true; value: unknown }
  | { ok: false; error: SerializedError };

/** Params of the single generic RPC request electro-start registers. */
export interface MainFnCallParams {
  /** The main-fn id passed to createMainFn. */
  id: string;
  /** superjson-encoded args array. */
  payload: string;
}

/** The RPC method name electro-start reserves on the bun-side schema. */
export const MAIN_FN_RPC_METHOD = "__electroStartCall" as const;

export function encodeArgs(args: unknown[]): string {
  return superjson.stringify(args);
}

export function decodeArgs(payload: string): unknown[] {
  return superjson.parse(payload) as unknown[];
}

export function encodeResult(envelope: ResultEnvelope): string {
  return superjson.stringify(envelope);
}

export function decodeResult(payload: string): ResultEnvelope {
  return superjson.parse(payload) as ResultEnvelope;
}

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      data: (error as Error & { data?: unknown }).data,
    };
  }
  return { name: "Error", message: String(error) };
}
