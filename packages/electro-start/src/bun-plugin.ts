import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectMainFnIds } from "./runtime/discovery.ts";

export interface ElectroStartBunPluginOptions {
  /** Directory containing colocated main-fn modules. */
  root?: string;
  /** Bun process entrypoint that calls startApp(). */
  entry?: string;
}

const PACKAGE_EXPORTS: Record<string, string> = {
  "electro-start": "src/index.ts",
  "electro-start/runtime": "src/runtime/index.ts",
  "electro-start/client": "src/client/index.ts",
  "electro-start/bun-plugin": "src/bun-plugin.ts",
  "electro-start/id": "src/id.ts",
  "electro-start/query": "src/query/index.ts",
};

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
 * Prefer the app's `file:` dependency path — Bun's `.bun` store encodes `..`
 * into directory names, which Electrobun's bundler rejects as non-absolute.
 */
function packageRoot(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      overrides?: Record<string, string>;
    };
    const spec =
      pkg.dependencies?.["electro-start"] ?? pkg.overrides?.["electro-start"];
    if (typeof spec === "string" && spec.startsWith("file:")) {
      return resolve(spec.slice("file:".length));
    }
  } catch {
    // fall through
  }

  try {
    const fromPlugin = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    if (
      fromPlugin.startsWith("/") &&
      !fromPlugin.includes("/.bun/") &&
      !fromPlugin.includes("+..+")
    ) {
      return fromPlugin;
    }
  } catch {
    // fall through
  }

  return resolve(process.cwd(), "node_modules/electro-start");
}

/**
 * Bun build plugin for Electrobun. It injects discovered main-fn modules into
 * the Bun entrypoint so they are included in packaged applications.
 */
export function electroStartBun(
  options: ElectroStartBunPluginOptions = {},
): Bun.BunPlugin {
  const root = absolutePath(options.root ?? "src/actions");
  const entry = absolutePath(options.entry ?? "src/main.ts");
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

      // Electrobun's bundler often cannot resolve package exports for
      // TypeScript / file:-linked packages. Map them to absolute source files.
      build.onResolve({ filter: /^electro-start(?:\/|$)/ }, (args) => {
        const relative = PACKAGE_EXPORTS[args.path];
        if (!relative) return undefined;
        return { path: resolve(packageRoot(), relative) };
      });

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
