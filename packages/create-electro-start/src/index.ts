#!/usr/bin/env bun
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./args.ts";
import { installDependencies } from "./install.ts";
import {
  resolveLocalPackagePaths,
  scaffoldProject,
} from "./scaffold.ts";

const HELP = `create-electro-start — scaffold an Electrobun + Vite + React desktop app

Usage:
  create-electro-start <dir> [options]

Options:
  --name <name>     Package / window title (default: directory basename)
  --local           Link electro-start packages from this monorepo via file:
  --skip-install    Write files only; do not run bun install
  --force           Allow scaffolding into a non-empty directory
  -h, --help        Show this help
`;

function cliPackageRoot(): string {
  // src/index.ts → package root
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export async function main(argv = Bun.argv.slice(2)): Promise<number> {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const root = cliPackageRoot();
  const templateRoot = resolve(root, "template");

  try {
    const result = await scaffoldProject(templateRoot, {
      targetDir: args.dir,
      name: args.name,
      force: args.force,
      localPackages: args.local ? resolveLocalPackagePaths(root) : undefined,
    });

    console.log(`Created ${result.name} at ${result.targetDir}`);
    console.log(`  identifier: ${result.identifier}`);

    if (!args.skipInstall) {
      console.log("Installing dependencies with bun…");
      await installDependencies(result.targetDir);
    }

    console.log("");
    console.log("Next steps:");
    if (args.dir !== ".") {
      console.log(`  cd ${args.dir}`);
    }
    if (args.skipInstall) {
      console.log("  bun install");
    }
    console.log("  bun run dev:hmr");
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main();
}
