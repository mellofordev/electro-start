import { injectMainFnIds } from "./runtime/discovery.ts";

export interface ElectroStartBunPluginOptions {
  /** Directory containing colocated main-fn modules. */
  root?: string;
  /** Bun process entrypoint that calls startApp(). */
  entry?: string;
}

function absolutePath(path: string): string {
  if (path.startsWith("/")) return path.replace(/[\\/]+$/, "");
  return `${process.cwd()}/${path}`.replace(/[\\/]+$/, "");
}

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

/**
 * Bun build plugin for Electrobun. It injects discovered main-fn modules into
 * the Bun entrypoint so they are included in packaged applications.
 */
export function electroStartBun(
  options: ElectroStartBunPluginOptions = {},
): Bun.BunPlugin {
  const root = absolutePath(options.root ?? "src/mainview");
  const entry = absolutePath(options.entry ?? "src/bun/index.ts");
  const rootFilter = new RegExp(
    `^${escapeRegExp(root)}(?:[/\\\\]).*\\.[cm]?[jt]sx?$`,
  );
  const entryFilter = new RegExp(`^${escapeRegExp(entry)}$`);

  return {
    name: "electro-start-bun",
    target: "bun",
    async setup(build) {
      const modules: string[] = [];
      const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}");
      for (const fileName of glob.scanSync({
        cwd: root,
        absolute: true,
        onlyFiles: true,
      })) {
        const code = await Bun.file(fileName).text();
        if (code.includes("createMainFn")) modules.push(fileName);
      }

      build.onLoad({ filter: entryFilter }, async ({ path }) => {
        const imports = modules.map(
          (fileName) => `import ${JSON.stringify(fileName)};`,
        );
        const source = await Bun.file(path).text();
        return {
          contents:
            `${imports.join("\n")}\n` +
            `globalThis.__electroStartPrebundled = true;\n` +
            source,
          loader: loaderFor(path),
        };
      });

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
  };
}
