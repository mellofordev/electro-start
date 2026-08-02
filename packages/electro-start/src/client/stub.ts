/**
 * Client-side stub for a main fn. Dependency-free (no electrobun import):
 * calls go through a dispatcher that `initElectroStart()` installs, so this
 * module is safe to reference from the shared entry and from generated code.
 */

import {
  decodeResult,
  encodeArgs,
  type MainFnCallParams,
} from "../serialize.ts";
import { MainFnError } from "./errors.ts";
import type { MainFn } from "../index.ts";

type Dispatcher = (params: MainFnCallParams) => Promise<string>;

const DISPATCHER_KEY = "__electroStartDispatch";

export function installDispatcher(dispatch: Dispatcher): void {
  (globalThis as Record<string, unknown>)[DISPATCHER_KEY] = dispatch;
}

function getDispatcher(): Dispatcher {
  const dispatch = (globalThis as Record<string, unknown>)[DISPATCHER_KEY];
  if (typeof dispatch !== "function") {
    throw new MainFnError(
      "[electro-start] RPC bridge not initialized. " +
        "Call initElectroStart() from 'electro-start/client' before invoking main fns.",
    );
  }
  return dispatch as Dispatcher;
}

export function createClientStub<Args extends unknown[], Result>(
  id: string,
): MainFn<Args, Result> {
  const stub = async (...args: Args): Promise<Result> => {
    const raw = await getDispatcher()({ id, payload: encodeArgs(args) });
    const envelope = decodeResult(raw);
    if (envelope.ok) return envelope.value as Result;
    throw MainFnError.fromSerialized(id, envelope.error);
  };
  return Object.assign(stub, { __mainFnId: id }) as MainFn<Args, Result>;
}
