import { readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toAppIdentifier } from "./args.ts";

export interface ScaffoldOptions {
  targetDir: string;
  name: string;
  force: boolean;
  /** Absolute paths used when rewriting deps with --local. */
  localPackages?: {
    electroStart: string;
    vitePlugin: string;
  };
}

/** Clean consumer tsconfig (no monorepo path aliases). */
const SCAFFOLD_TSCONFIG_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "scaffold-tsconfig.json",
);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".html",
  ".css",
  ".md",
  ".gitignore",
]);

function isTextFile(relativePath: string): boolean {
  if (relativePath.endsWith(".gitignore")) return true;
  const dot = relativePath.lastIndexOf(".");
  if (dot === -1) return false;
  return TEXT_EXTENSIONS.has(relativePath.slice(dot));
}

async function listTemplateFiles(
  templateRoot: string,
  relative = "",
): Promise<string[]> {
  const dir = relative ? join(templateRoot, relative) : templateRoot;
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(templateRoot, next)));
    } else if (entry.isFile()) {
      files.push(next);
    }
  }
  return files;
}

function substitute(content: string, name: string, identifier: string): string {
  return content
    .replaceAll("__APP_NAME__", name)
    .replaceAll("__APP_IDENTIFIER__", identifier);
}

function applyLocalDeps(
  packageJson: string,
  local: NonNullable<ScaffoldOptions["localPackages"]>,
): string {
  const pkg = JSON.parse(packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (pkg.dependencies?.["electro-start"]) {
    pkg.dependencies["electro-start"] = `file:${local.electroStart}`;
  }
  if (pkg.devDependencies?.["@electro-start/vite-plugin"]) {
    pkg.devDependencies["@electro-start/vite-plugin"] =
      `file:${local.vitePlugin}`;
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

export async function scaffoldProject(
  templateRoot: string,
  options: ScaffoldOptions,
): Promise<{ targetDir: string; name: string; identifier: string }> {
  const targetDir = resolve(options.targetDir);
  const identifier = toAppIdentifier(options.name);

  let dirExists = false;
  try {
    const contents = await readdir(targetDir);
    dirExists = true;
    if (contents.length > 0 && !options.force) {
      throw new Error(
        `Target directory is not empty: ${targetDir}\nUse --force to overwrite.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Target directory is not empty")
    ) {
      throw error;
    }
    dirExists = false;
  }

  if (!dirExists) {
    await Bun.$`mkdir -p ${targetDir}`.quiet();
  }

  const files = await listTemplateFiles(templateRoot);
  for (const relative of files) {
    const sourcePath = join(templateRoot, relative);
    const destPath = join(targetDir, relative);
    await Bun.$`mkdir -p ${join(destPath, "..")}`.quiet();

    if (!isTextFile(relative)) {
      await Bun.write(destPath, Bun.file(sourcePath));
      continue;
    }

    let content: string;
    if (relative === "tsconfig.json") {
      // Template tsconfig uses monorepo path aliases for IDE typechecking;
      // generated apps get a clean consumer config instead.
      content = await Bun.file(SCAFFOLD_TSCONFIG_PATH).text();
    } else {
      content = await Bun.file(sourcePath).text();
      content = substitute(content, options.name, identifier);
      if (relative === "package.json" && options.localPackages) {
        content = applyLocalDeps(content, options.localPackages);
      }
    }
    await Bun.write(destPath, content);
  }

  return { targetDir, name: options.name, identifier };
}

/** Resolve absolute paths to monorepo framework packages for --local. */
export function resolveLocalPackagePaths(cliPackageRoot: string): {
  electroStart: string;
  vitePlugin: string;
} {
  const packagesRoot = resolve(cliPackageRoot, "..");
  return {
    electroStart: resolve(packagesRoot, "electro-start"),
    vitePlugin: resolve(packagesRoot, "vite-plugin"),
  };
}
