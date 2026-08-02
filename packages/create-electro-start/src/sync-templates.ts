#!/usr/bin/env bun
/**
 * Copy examples/* → templates/* for npm publish.
 * In the monorepo, create-electro-start reads examples/ directly.
 */
import { readdir, rm, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { examplesRoot } from "./scaffold.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templatesDir = resolve(packageRoot, "templates");
const examplesDir = examplesRoot(packageRoot);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "dist",
  "build",
  "artifacts",
  ".tanstack",
  ".git",
]);

async function copyDir(src: string, dest: string): Promise<void> {
  await Bun.$`mkdir -p ${dest}`.quiet();
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name) || entry.name === ".DS_Store") continue;
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
      continue;
    }
    if (!entry.isFile()) continue;

    if (entry.name === "package.json") {
      const pkg = await Bun.file(from).json();
      for (const bag of [pkg.dependencies, pkg.devDependencies]) {
        if (!bag) continue;
        for (const [key, value] of Object.entries(bag)) {
          if (value === "workspace:*") bag[key] = "^0.0.1";
        }
      }
      await Bun.write(to, `${JSON.stringify(pkg, null, 2)}\n`);
      continue;
    }

    if (entry.name === "electrobun.config.ts") {
      let content = await Bun.file(from).text();
      content = content.replace(
        /from\s+["'](?:\.\.\/)+packages\/electro-start\/src\/bun-plugin\.ts["']/,
        'from "electro-start/bun-plugin"',
      );
      await Bun.write(to, content);
      continue;
    }

    if (entry.name === "llms.txt") continue;

    await Bun.write(to, Bun.file(from));
  }
}

async function main() {
  await rm(templatesDir, { recursive: true, force: true });
  await Bun.$`mkdir -p ${templatesDir}`.quiet();

  const entries = await readdir(examplesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    try {
      await stat(join(examplesDir, entry.name, "template.json"));
    } catch {
      continue;
    }
    await copyDir(join(examplesDir, entry.name), join(templatesDir, entry.name));
    console.log(`synced templates/${entry.name}`);
  }
}

if (import.meta.main) {
  await main();
}
