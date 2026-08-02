/**
 * Main-fn registry — lives in the bun process. Dependency-free so that the
 * shared entry (`electro-start`) can import it without pulling in
 * electrobun/bun.
 */

export type AnyMainFnImpl = (...args: never[]) => unknown;

const registry = new Map<string, (...args: unknown[]) => unknown>();

export function registerMainFn(
  id: string,
  fn: (...args: unknown[]) => unknown,
): void {
  if (registry.has(id)) {
    throw new Error(
      `[electro-start] Duplicate main fn id "${id}". ` +
        `Each createMainFn id must be unique across the app.`,
    );
  }
  registry.set(id, fn);
}

export function getMainFn(
  id: string,
): ((...args: unknown[]) => unknown) | undefined {
  return registry.get(id);
}

export function listMainFnIds(): string[] {
  return [...registry.keys()];
}
