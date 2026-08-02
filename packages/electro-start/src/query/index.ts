/**
 * electro-start/query — optional TanStack Query helpers for main fns.
 * Dependency-free: returns plain option objects compatible with
 * useQuery/useMutation/queryOptions from @tanstack/react-query v5.
 */

import type { MainFn } from "../index.ts";

/** Stable query key for a main fn call: [id, ...args]. */
export function mainFnQueryKey<Args extends unknown[]>(
  fn: MainFn<Args, unknown>,
  ...args: Args
): readonly [string, ...Args] {
  return [fn.__mainFnId, ...args] as const;
}

/**
 * ```tsx
 * const { data } = useQuery(mainFnQueryOptions(listTodos));
 * ```
 */
export function mainFnQueryOptions<Args extends unknown[], Result>(
  fn: MainFn<Args, Result>,
  ...args: Args
): {
  queryKey: readonly [string, ...Args];
  queryFn: () => Promise<Result>;
} {
  return {
    queryKey: mainFnQueryKey(fn, ...args),
    queryFn: () => fn(...args),
  };
}

/**
 * Variables are the main fn's argument tuple:
 *
 * ```tsx
 * const addTodo = useMutation(mainFnMutationOptions(createTodo));
 * addTodo.mutate(["buy milk"]);
 * ```
 */
export function mainFnMutationOptions<Args extends unknown[], Result>(
  fn: MainFn<Args, Result>,
): {
  mutationKey: readonly [string];
  mutationFn: (variables: Args) => Promise<Result>;
} {
  return {
    mutationKey: [fn.__mainFnId] as const,
    mutationFn: (variables: Args) => fn(...variables),
  };
}
