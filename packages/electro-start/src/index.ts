/**
 * Shared entry: safe to import from BOTH the Bun process and the webview.
 * Contains only: createMainFn, shared types, error class.
 */

import { registerMainFn } from "./runtime/registry.ts";
import { createClientStub } from "./client/stub.ts";

export { MainFnError } from "./client/errors.ts";
export { deriveMainFnId } from "./id.ts";
export type {
  ResultEnvelope,
  SerializedError,
  MainFnCallParams,
} from "./serialize.ts";

export type MainFn<Args extends unknown[], Result> = ((
  ...args: Args
) => Promise<Result>) & {
  readonly __mainFnId: string;
};

/** Extract the callable signature of a MainFn (handy for mocks and wrappers). */
export type MainFnCaller<F> =
  F extends MainFn<infer Args, infer Result>
    ? (...args: Args) => Promise<Result>
    : never;

const isMainProcess =
  typeof (globalThis as { Bun?: unknown }).Bun !== "undefined" &&
  typeof (globalThis as { window?: unknown }).window === "undefined";

export interface MainFnOptions {
  /** Override the compiler-derived RPC id. Prefer the default for most apps. */
  id?: string;
}

type MaybePromise<T> = T | Promise<T>;

type HandlerContext<Data> = [Data] extends [void]
  ? Record<never, never>
  : { data: Data };

type BuiltMainFn<Input, Result> = [Input] extends [void]
  ? MainFn<[], Awaited<Result>>
  : MainFn<[{ data: Input }], Awaited<Result>>;

export interface MainFnBuilder<Input = void, Data = void> {
  /**
   * Validate and optionally transform the value received from the webview.
   * Both the caller input and handler data types are inferred.
   */
  validator<NextInput, NextData>(
    validate: (input: NextInput) => MaybePromise<NextData>,
  ): MainFnBuilder<NextInput, Awaited<NextData>>;

  /** Finalize the main fn. Its return type is inferred for callers. */
  handler<Result>(
    handler: (context: HandlerContext<Data>) => MaybePromise<Result>,
  ): BuiltMainFn<Input, Result>;
}

type Validator = (input: unknown) => MaybePromise<unknown>;

function buildMainFn<Input, Data>(
  options: MainFnOptions,
  validator?: Validator,
): MainFnBuilder<Input, Data> {
  return {
    validator<NextInput, NextData>(
      validate: (input: NextInput) => MaybePromise<NextData>,
    ) {
      return buildMainFn<NextInput, Awaited<NextData>>(
        options,
        validate as Validator,
      );
    },

    handler<Result>(
      handler: (context: HandlerContext<Data>) => MaybePromise<Result>,
    ): BuiltMainFn<Input, Result> {
      const id = options.id;
      if (!id) {
        throw new Error(
          "[electro-start] createMainFn() is missing its compiler-derived id. " +
            "Use @electro-start/vite-plugin and startApp(), or pass { id } explicitly.",
        );
      }

      if (!isMainProcess) {
        return createClientStub(id) as BuiltMainFn<Input, Result>;
      }

      const invoke = async (callOptions?: { data: Input }) => {
        if (!validator) {
          return handler({} as HandlerContext<Data>);
        }
        const data = await validator(callOptions?.data);
        return handler({ data } as HandlerContext<Data>);
      };
      registerMainFn(id, invoke as (...args: unknown[]) => unknown);
      return Object.assign(invoke, { __mainFnId: id }) as BuiltMainFn<
        Input,
        Result
      >;
    },
  };
}

/** Define a compiler-discovered function that executes in the Bun process. */
export function createMainFn(options?: MainFnOptions): MainFnBuilder;
/**
 * @deprecated Use `createMainFn({ id }).handler(fn)`. This overload remains
 * temporarily for migration from electro-start 0.0.x.
 */
export function createMainFn<Args extends unknown[], Result>(
  id: string,
  fn: (...args: Args) => Promise<Result> | Result,
): MainFn<Args, Result>;
export function createMainFn<Args extends unknown[], Result>(
  optionsOrId: MainFnOptions | string = {},
  legacyFn?: (...args: Args) => MaybePromise<Result>,
): MainFnBuilder | MainFn<Args, Result> {
  if (typeof optionsOrId === "string") {
    const id = optionsOrId;
    if (!legacyFn) {
      throw new Error("[electro-start] Legacy createMainFn requires a handler.");
    }
    if (!isMainProcess) return createClientStub<Args, Result>(id);

    const invoke = async (...args: Args): Promise<Result> => legacyFn(...args);
    registerMainFn(id, invoke as (...args: unknown[]) => unknown);
    return Object.assign(invoke, { __mainFnId: id }) as MainFn<Args, Result>;
  }

  return buildMainFn(optionsOrId);
}
