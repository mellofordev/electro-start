/**
 * electro-start/runtime — import ONLY from the Bun main process.
 */

import { BrowserWindow, Updater, type WindowOptionsType } from "electrobun/bun";
import { createMainFnRPC, type ElectroStartRPC } from "./rpc.ts";
import { discoverMainFnModules } from "./discovery.ts";

export { registerMainFn, getMainFn, listMainFnIds } from "./registry.ts";
export {
  createMainFnRPC,
  type ElectroStartRPC,
  type ElectroStartRPCSchema,
  type MainFnRPCOptions,
} from "./rpc.ts";
export {
  discoverMainFnModules,
  injectMainFnIds,
  listDiscoveredMainFnModules,
} from "./discovery.ts";

type WindowOptions = Omit<Partial<WindowOptionsType>, "url" | "rpc" | "frame"> & {
  frame?: Partial<WindowOptionsType["frame"]>;
};

export interface StartAppOptions {
  /**
   * Source root scanned for createMainFn modules.
   * @default "<cwd>/src/actions"
   */
  root?: string;
  /** BrowserWindow options (title, frame, titleBarStyle, ...). */
  window?: WindowOptions;
  /**
   * The view to load, as configured in electrobun.config.ts.
   * @default "app"
   */
  view?: string;
  /**
   * Vite dev server used for HMR. When the app runs on the "dev" channel and
   * the server responds, the window loads it instead of the bundled view.
   * Pass `false` to always load the bundled view.
   * @default { port: 5173 }
   */
  devServer?: { port?: number; url?: string } | false;
  /** Max time (ms) for bun -> webview requests. @default 30_000 */
  maxRequestTime?: number;
}

export interface ElectroStartApp {
  window: BrowserWindow;
  rpc: ElectroStartRPC;
  /** The URL the window loaded (dev server or views://). */
  url: string;
}

async function resolveViewUrl(
  view: string,
  devServer: StartAppOptions["devServer"],
): Promise<string> {
  const bundledUrl = `views://${view}/index.html`;
  if (devServer === false) return bundledUrl;

  const channel = await Updater.localInfo.channel();
  if (channel !== "dev") return bundledUrl;

  const devUrl = devServer?.url ?? `http://localhost:${devServer?.port ?? 5173}`;
  try {
    // Bound the probe so a stuck localhost fetch can't block window creation.
    await fetch(devUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(750),
    });
    console.log(`[electro-start] HMR: loading ${devUrl}`);
    return devUrl;
  } catch {
    console.log(
      `[electro-start] Vite dev server not running at ${devUrl}, loading bundled view.`,
    );
    return bundledUrl;
  }
}

/**
 * Boot the app: wires the main-fn RPC bridge and opens the main window,
 * preferring the Vite dev server (HMR) when it is running in dev.
 *
 * Main-fn modules under `root` are discovered and registered automatically:
 *
 * ```ts
 * import { startApp } from "electro-start/runtime";
 *
 * await startApp({ window: { title: "My App" } });
 * ```
 */
export async function startApp(
  options: StartAppOptions = {},
): Promise<ElectroStartApp> {
  const configuredRoot = options.root ?? `${process.cwd()}/src/actions`;
  const root = configuredRoot.startsWith("/")
    ? configuredRoot
    : `${process.cwd()}/${configuredRoot}`;
  const wasPrebundled = Boolean(
    (globalThis as Record<string, unknown>)["__electroStartPrebundled"],
  );
  if (!wasPrebundled) await discoverMainFnModules(root);

  const rpc = createMainFnRPC({ maxRequestTime: options.maxRequestTime });
  const url = await resolveViewUrl(options.view ?? "app", options.devServer);

  const { frame, ...windowRest } = options.window ?? {};
  const window = new BrowserWindow({
    ...windowRest,
    ...(frame
      ? {
          frame: {
            x: frame.x ?? 0,
            y: frame.y ?? 0,
            width: frame.width ?? 800,
            height: frame.height ?? 600,
          },
        }
      : {}),
    url,
    rpc,
  });

  return { window, rpc, url };
}
