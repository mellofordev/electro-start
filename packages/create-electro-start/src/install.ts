/** Run `bun install` in the scaffolded project directory. */
export async function installDependencies(targetDir: string): Promise<void> {
  const result = await Bun.$`bun install`.cwd(targetDir);
  if (result.exitCode !== 0) {
    throw new Error(`bun install failed with exit code ${result.exitCode}`);
  }
}
