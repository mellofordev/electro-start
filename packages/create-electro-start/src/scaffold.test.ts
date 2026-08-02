import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, toAppIdentifier } from "./args.ts";
import {
  resolveLocalPackagePaths,
  scaffoldProject,
} from "./scaffold.ts";

const packageRoot = resolve(fileURLToPath(import.meta.url), "../..");
const templateRoot = join(packageRoot, "template");
const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function tempProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "create-electro-start-"));
  tempDirs.push(dir);
  return dir;
}

test("parseArgs requires a directory or --name", () => {
  expect(() => parseArgs([])).toThrow(/Missing project directory/);
});

test("parseArgs derives name from directory basename", () => {
  const args = parseArgs(["./apps/demo-app", "--skip-install"]);
  expect(args.dir).toBe("./apps/demo-app");
  expect(args.name).toBe("demo-app");
  expect(args.skipInstall).toBe(true);
  expect(args.local).toBe(false);
});

test("toAppIdentifier slugifies names", () => {
  expect(toAppIdentifier("My Cool App")).toBe("dev.electrostart.my-cool-app");
});

test("scaffold writes a complete project with substitutions", async () => {
  const targetDir = await tempProjectDir();
  const result = await scaffoldProject(templateRoot, {
    targetDir,
    name: "demo-app",
    force: false,
  });

  expect(result.identifier).toBe("dev.electrostart.demo-app");

  const pkg = await Bun.file(join(targetDir, "package.json")).json();
  expect(pkg.name).toBe("demo-app");
  expect(pkg.scripts["dev:hmr"]).toContain("hmr");
  expect(pkg.dependencies["electro-start"]).toBe("^0.0.1");
  expect(pkg.devDependencies["@electro-start/vite-plugin"]).toBe("^0.0.1");

  const electrobun = await Bun.file(
    join(targetDir, "electrobun.config.ts"),
  ).text();
  expect(electrobun).toContain(
    `import { electroStartBun } from "electro-start/bun-plugin"`,
  );
  expect(electrobun).not.toContain("../../packages/");
  expect(electrobun).toContain(`name: "demo-app"`);
  expect(electrobun).toContain(`identifier: "dev.electrostart.demo-app"`);

  expect(await Bun.file(join(targetDir, "src/bun/index.ts")).exists()).toBe(
    true,
  );
  expect(
    await Bun.file(join(targetDir, "src/mainview/todos.ts")).exists(),
  ).toBe(true);

  const bunEntry = await Bun.file(join(targetDir, "src/bun/index.ts")).text();
  expect(bunEntry).toContain(`title: "demo-app"`);
  expect(bunEntry).not.toContain("fns/");

  const tsconfig = await Bun.file(join(targetDir, "tsconfig.json")).json();
  expect(tsconfig.compilerOptions.paths).toBeUndefined();
  expect(tsconfig.compilerOptions.lib).toContain("DOM");
  expect(
    await Bun.file(join(targetDir, "src/vite-env.d.ts")).exists(),
  ).toBe(true);
});

test("scaffold --local rewrites framework deps to file: paths", async () => {
  const targetDir = await tempProjectDir();
  const local = resolveLocalPackagePaths(packageRoot);
  await scaffoldProject(templateRoot, {
    targetDir,
    name: "local-app",
    force: false,
    localPackages: local,
  });

  const pkg = await Bun.file(join(targetDir, "package.json")).json();
  expect(pkg.dependencies["electro-start"]).toBe(`file:${local.electroStart}`);
  expect(pkg.devDependencies["@electro-start/vite-plugin"]).toBe(
    `file:${local.vitePlugin}`,
  );
});

test("scaffold rejects non-empty dirs without --force", async () => {
  const targetDir = await tempProjectDir();
  await Bun.write(join(targetDir, "existing.txt"), "nope");
  await expect(
    scaffoldProject(templateRoot, {
      targetDir,
      name: "blocked",
      force: false,
    }),
  ).rejects.toThrow(/not empty/);
});
