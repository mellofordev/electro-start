import { readdir, stat } from "node:fs/promises";
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

export interface TemplateMeta {
  id: string;
  description: string;
  packageName: string;
  identifier: string;
  displayName: string;
  root: string;
}

/** Clean consumer tsconfig (no monorepo path aliases). */
const SCAFFOLD_TSCONFIG_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "scaffold-tsconfig.json",
);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "artifacts",
  ".tanstack",
  ".git",
  ".DS_Store",
]);

const SKIP_FILE_NAMES = new Set([
  "template.json",
  "llms.txt",
  ".DS_Store",
]);

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
    if (SKIP_DIR_NAMES.has(entry.name) || SKIP_FILE_NAMES.has(entry.name)) {
      continue;
    }
    const next = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await listTemplateFiles(templateRoot, next)));
    } else if (entry.isFile()) {
      files.push(next);
    }
  }
  return files;
}

async function readTemplateMeta(
  templateRoot: string,
  id: string,
): Promise<TemplateMeta> {
  const metaPath = join(templateRoot, "template.json");
  const raw = (await Bun.file(metaPath).json()) as {
    description?: string;
    packageName: string;
    identifier: string;
    displayName: string;
  };
  return {
    id,
    description: raw.description ?? id,
    packageName: raw.packageName,
    identifier: raw.identifier,
    displayName: raw.displayName,
    root: templateRoot,
  };
}

/**
 * Resolve a template directory.
 * - Monorepo / local CLI: `examples/<id>`
 * - Published package: `templates/<id>` (synced from examples on publish)
 */
export async function resolveTemplateRoot(
  cliPackageRoot: string,
  templateId: string,
): Promise<TemplateMeta> {
  // Prefer examples/ in the monorepo; published packages ship templates/.
  const candidates = [
    resolve(cliPackageRoot, "../../examples", templateId),
    resolve(cliPackageRoot, "templates", templateId),
  ];

  for (const root of candidates) {
    try {
      const info = await stat(join(root, "template.json"));
      if (info.isFile()) {
        return readTemplateMeta(root, templateId);
      }
    } catch {
      // try next
    }
  }

  const available = await listTemplateIds(cliPackageRoot);
  const hint =
    available.length > 0
      ? `Available: ${available.join(", ")}`
      : "No templates found.";
  throw new Error(`Unknown template "${templateId}". ${hint}`);
}

export async function listTemplateIds(
  cliPackageRoot: string,
): Promise<string[]> {
  const dirs = [
    resolve(cliPackageRoot, "../../examples"),
    resolve(cliPackageRoot, "templates"),
  ];
  const ids = new Set<string>();
  for (const dir of dirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        try {
          await stat(join(dir, entry.name, "template.json"));
          ids.add(entry.name);
        } catch {
          // not a template
        }
      }
    } catch {
      // dir missing
    }
  }
  return [...ids].toSorted();
}

function applyTemplateSubstitutions(
  content: string,
  meta: TemplateMeta,
  name: string,
  identifier: string,
): string {
  // Longer / more specific strings first to avoid partial collisions.
  return content
    .replaceAll(meta.packageName, name)
    .replaceAll(meta.identifier, identifier)
    .replaceAll(meta.displayName, name);
}

function applyLocalDeps(
  packageJson: string,
  local: NonNullable<ScaffoldOptions["localPackages"]>,
): string {
  const pkg = JSON.parse(packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    overrides?: Record<string, string>;
  };
  const electroStart = `file:${local.electroStart}`;
  const vitePlugin = `file:${local.vitePlugin}`;

  if (pkg.dependencies?.["electro-start"]) {
    pkg.dependencies["electro-start"] = electroStart;
  }
  if (pkg.devDependencies?.["@electro-start/vite-plugin"]) {
    pkg.devDependencies["@electro-start/vite-plugin"] = vitePlugin;
  }
  pkg.overrides = {
    ...pkg.overrides,
    "electro-start": electroStart,
    "@electro-start/vite-plugin": vitePlugin,
  };
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

/** Turn monorepo workspace: deps into publishable semver ranges. */
function applyPublishedDeps(packageJson: string): string {
  const pkg = JSON.parse(packageJson) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  for (const bag of [pkg.dependencies, pkg.devDependencies]) {
    if (!bag) continue;
    for (const [key, value] of Object.entries(bag)) {
      if (value === "workspace:*") {
        bag[key] = "^0.0.1";
      }
    }
  }
  return `${JSON.stringify(pkg, null, 2)}\n`;
}

function rewriteElectrobunConfig(content: string): string {
  // Examples import the Bun plugin from the monorepo source tree.
  let next = content.replace(
    /from\s+["'](?:\.\.\/)+packages\/electro-start\/src\/bun-plugin\.ts["']/,
    'from "electro-start/bun-plugin"',
  );
  // Electrobun's config loader cannot resolve TS package exports for
  // file: installs — point at the linked package file instead.
  next = next.replace(
    'from "electro-start/bun-plugin"',
    'from "./node_modules/electro-start/src/bun-plugin.ts"',
  );
  return next;
}

export async function scaffoldProject(
  template: TemplateMeta,
  options: ScaffoldOptions,
): Promise<{
  targetDir: string;
  name: string;
  identifier: string;
  template: string;
}> {
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

  const files = await listTemplateFiles(template.root);
  for (const relative of files) {
    const sourcePath = join(template.root, relative);
    const destPath = join(targetDir, relative);
    await Bun.$`mkdir -p ${join(destPath, "..")}`.quiet();

    if (!isTextFile(relative)) {
      await Bun.write(destPath, Bun.file(sourcePath));
      continue;
    }

    let content: string;
    if (relative === "tsconfig.json") {
      content = await Bun.file(SCAFFOLD_TSCONFIG_PATH).text();
    } else {
      content = await Bun.file(sourcePath).text();
      content = applyTemplateSubstitutions(
        content,
        template,
        options.name,
        identifier,
      );
      if (relative === "package.json") {
        content = options.localPackages
          ? applyLocalDeps(content, options.localPackages)
          : applyPublishedDeps(content);
      }
      if (relative === "electrobun.config.ts") {
        content = rewriteElectrobunConfig(content);
      }
    }
    await Bun.write(destPath, content);
  }

  return {
    targetDir,
    name: options.name,
    identifier,
    template: template.id,
  };
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

/** Used by prepublish to copy examples → templates for the npm package. */
export function examplesRoot(cliPackageRoot: string): string {
  return resolve(cliPackageRoot, "../../examples");
}
