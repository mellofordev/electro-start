/** Run `bun install` in the scaffolded project directory. */
export async function installDependencies(
  targetDir: string,
  options: { quiet?: boolean } = {},
): Promise<void> {
  const proc = Bun.$`bun install`.cwd(targetDir);
  const result = options.quiet ? await proc.quiet() : await proc;
  if (result.exitCode !== 0) {
    throw new Error(`bun install failed with exit code ${result.exitCode}`);
  }
}
