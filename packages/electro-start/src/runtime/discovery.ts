import { deriveMainFnId } from "../id.ts";

const MAIN_FN_EXPORT =
  /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*createMainFn\s*\(\s*(\{[\s\S]*?\})?\s*\)/g;

let installedRoot: string | undefined;
let discoveredModules: string[] = [];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function loaderFor(path: string): "js" | "jsx" | "ts" | "tsx" {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".ts") || path.endsWith(".mts") || path.endsWith(".cts")) {
    return "ts";
  }
  return "js";
}

/** Inject compiler-derived ids into main-fn builder calls loaded by Bun. */
export function injectMainFnIds(
  code: string,
  fileName: string,
  root: string,
): string {
  return code.replace(
    MAIN_FN_EXPORT,
    (match, exportName: string, options: string | undefined) => {
      if (options && /(?:^|[,{\s])id\s*(?::|[,}])/.test(options)) {
        return match;
      }
      const id = JSON.stringify(deriveMainFnId(fileName, exportName, root));
      const injectedOptions = options
        ? options.replace(/^\{/, `{ id: ${id},`)
        : `{ id: ${id} }`;
      return match.replace(
        /createMainFn\s*\([\s\S]*\)$/,
        `createMainFn(${injectedOptions})`,
      );
    },
  );
}

function installDiscoveryPlugin(root: string): void {
  if (installedRoot === root) return;
  if (installedRoot) {
    throw new Error(
      `[electro-start] Main-fn discovery is already configured for "${installedRoot}".`,
    );
  }

  installedRoot = root;
  const rootFilter = new RegExp(
    `^${escapeRegExp(root)}(?:[/\\\\]).*\\.[cm]?[jt]sx?$`,
  );
  Bun.plugin({
    name: "electro-start-main-fns",
    setup(build) {
      build.onLoad({ filter: rootFilter }, async ({ path }) => {
        const code = await Bun.file(path).text();
        return {
          contents: code.includes("createMainFn")
            ? injectMainFnIds(code, path, root)
            : code,
          loader: loaderFor(path),
        };
      });
    },
  });
}

export async function discoverMainFnModules(root: string): Promise<string[]> {
  const normalizedRoot = root.replace(/[\\/]+$/, "");
  installDiscoveryPlugin(normalizedRoot);

  const modules: string[] = [];
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}");
  for await (const relative of glob.scan({
    cwd: normalizedRoot,
    absolute: true,
    onlyFiles: true,
  })) {
    const code = await Bun.file(relative).text();
    if (!code.includes("createMainFn")) continue;
    modules.push(relative);
  }

  modules.sort();
  for (const modulePath of modules) {
    await import(Bun.pathToFileURL(modulePath).href);
  }
  discoveredModules = modules;
  return [...modules];
}

export function listDiscoveredMainFnModules(): string[] {
  return [...discoveredModules];
}
