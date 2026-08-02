/**
 * The main-fn call handler, kept free of electrobun imports so it can be
 * unit-tested with `bun test`. rpc.ts wires it onto the Electrobun bridge.
 */

import {
  decodeArgs,
  encodeResult,
  serializeError,
  type MainFnCallParams,
} from "../serialize.ts";
import { getMainFn, listMainFnIds } from "./registry.ts";

export async function handleMainFnCall(
  params: MainFnCallParams,
): Promise<string> {
  const fn = getMainFn(params.id);
  if (!fn) {
    return encodeResult({
      ok: false,
      error: {
        name: "MainFnNotFoundError",
        message:
          `[electro-start] No main fn registered with id "${params.id}". ` +
          `Make sure the module defining it is imported from your bun entry. ` +
          `Registered ids: ${listMainFnIds().join(", ") || "(none)"}`,
      },
    });
  }
  try {
    const args = decodeArgs(params.payload);
    const value = await fn(...args);
    return encodeResult({ ok: true, value });
  } catch (error) {
    return encodeResult({ ok: false, error: serializeError(error) });
  }
}
