/**
 * electro-start/client — import ONLY from webview (browser) code.
 * Boots the Electrobun bridge and installs the dispatcher that main-fn
 * stubs call into.
 */

import { Electroview } from "electrobun/view";
import type { RPCSchema } from "electrobun/view";
import { MAIN_FN_RPC_METHOD, type MainFnCallParams } from "../serialize.ts";
import { installDispatcher } from "./stub.ts";

export { createClientStub } from "./stub.ts";
export { MainFnError } from "./errors.ts";

// Mirrors ElectroStartRPCSchema in runtime/rpc.ts. Kept separate so this
// module never imports from electrobun/bun.
type ElectroStartRPCSchema = {
  bun: RPCSchema<{
    requests: {
      [MAIN_FN_RPC_METHOD]: { params: MainFnCallParams; response: string };
    };
  }>;
  webview: RPCSchema;
};

export interface InitElectroStartOptions {
  /** Max time (ms) a main-fn call may take before rejecting. @default 30_000 */
  maxRequestTime?: number;
}

export type ElectroStartClient = Electroview<
  ReturnType<typeof createClientRPC>
>;

function createClientRPC(options: InitElectroStartOptions) {
  return Electroview.defineRPC<ElectroStartRPCSchema>({
    maxRequestTime: options.maxRequestTime ?? 30_000,
    handlers: { requests: {}, messages: {} },
  });
}

let client: ElectroStartClient | undefined;

/**
 * Initialize the bridge. Call once, before rendering:
 *
 * ```tsx
 * import { initElectroStart } from "electro-start/client";
 * initElectroStart();
 * createRoot(document.getElementById("root")!).render(<App />);
 * ```
 */
export function initElectroStart(
  options: InitElectroStartOptions = {},
): ElectroStartClient {
  if (client) return client;

  const rpc = createClientRPC(options);
  client = new Electroview({ rpc });
  installDispatcher((params) => rpc.request[MAIN_FN_RPC_METHOD](params));
  return client;
}
