#!/usr/bin/env bun
import * as p from "@clack/prompts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./args.ts";
import { installDependencies } from "./install.ts";
import { resolveCliOptions } from "./prompts.ts";
import {
  listTemplateIds,
  resolveLocalPackagePaths,
  resolveTemplateRoot,
  scaffoldProject,
} from "./scaffold.ts";

const HELP = `create-electro-start — scaffold an Electrobun + Vite + React desktop app

Usage:
  create-electro-start              # interactive (asks project name in cwd)
  create-electro-start [dir] [options]

Options:
  --template <id>   Template from examples/ (default: basic)
  --name <name>     Package / window title (default: directory basename)
  --local           Link electro-start packages from this monorepo via file:
  --skip-install    Write files only; do not run bun install
  --force           Allow scaffolding into a non-empty directory
  --yes, -y         Skip prompts (non-interactive; requires <dir> or --name)
  --list-templates  List available templates
  -h, --help        Show this help
`;

function cliPackageRoot(): string {
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

  if (args.listTemplates) {
    const ids = await listTemplateIds(root);
    if (ids.length === 0) {
      console.error("No templates found.");
      return 1;
    }
    for (const id of ids) {
      const meta = await resolveTemplateRoot(root, id);
      console.log(`${id}\t${meta.description}`);
    }
    return 0;
  }

  if (args.yes && !args.dir && !args.name) {
    console.error(
      "Non-interactive mode (--yes) requires a project directory or --name.",
    );
    return 1;
  }

  try {
    const options = await resolveCliOptions(root, args);
    const template = await resolveTemplateRoot(root, options.template);

    const spin = p.spinner();
    spin.start("Scaffolding project files");
    const result = await scaffoldProject(template, {
      targetDir: options.dir,
      name: options.name,
      force: options.force,
      localPackages: options.local
        ? resolveLocalPackagePaths(root)
        : undefined,
    });
    spin.stop(`Created ${result.name}`);

    if (!options.skipInstall) {
      const installSpin = p.spinner();
      installSpin.start("Installing dependencies with bun");
      try {
        await installDependencies(result.targetDir, { quiet: true });
        installSpin.stop("Dependencies installed");
      } catch (error) {
        installSpin.stop("Dependency install failed");
        throw error;
      }

      // First electrobun invocation downloads platform CLI/core binaries (~30MB).
      const ebSpin = p.spinner();
      ebSpin.start("Warming Electrobun platform binaries (first run)");
      try {
        await Bun.$`bunx electrobun --help`
          .cwd(result.targetDir)
          .quiet()
          .nothrow();
        ebSpin.stop("Electrobun ready");
      } catch {
        ebSpin.stop(
          "Skipped Electrobun warmup (binaries download on first `bun run start`)",
        );
      }
    }

    p.note(
      [
        options.dir === "." ? null : `cd ${options.dir}`,
        options.skipInstall ? "bun install" : null,
        "bun run dev:hmr",
      ]
        .filter(Boolean)
        .join("\n"),
      "Next steps",
    );

    p.outro(
      `${result.name} ready · template ${result.template} · ${result.identifier}`,
    );
    return 0;
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main();
}
