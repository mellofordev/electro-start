/**
 * Bun-process side of the bridge. Registers ONE generic RPC request
 * (`__electroStartCall`) that dispatches to the main-fn registry, so the
 * Electrobun schema never has to change as the app adds functions.
 */

import { BrowserView, type RPCSchema } from "electrobun/bun";
import { MAIN_FN_RPC_METHOD, type MainFnCallParams } from "../serialize.ts";
import { handleMainFnCall } from "./handler.ts";

export type ElectroStartRPCSchema = {
  bun: RPCSchema<{
    requests: {
      [MAIN_FN_RPC_METHOD]: { params: MainFnCallParams; response: string };
    };
  }>;
  webview: RPCSchema;
};

export type ElectroStartRPC = ReturnType<typeof createMainFnRPC>;

export interface MainFnRPCOptions {
  /**
   * Max time (ms) a bun -> webview request may take. Webview -> bun main-fn
   * timeouts are configured on the client via initElectroStart().
   * @default 30_000
   */
  maxRequestTime?: number;
}

/** Create the bun-side RPC instance to pass to a BrowserWindow/BrowserView. */
export function createMainFnRPC(options: MainFnRPCOptions = {}) {
  return BrowserView.defineRPC<ElectroStartRPCSchema>({
    maxRequestTime: options.maxRequestTime ?? 30_000,
    handlers: {
      requests: {
        [MAIN_FN_RPC_METHOD]: handleMainFnCall,
      },
    },
  });
}
