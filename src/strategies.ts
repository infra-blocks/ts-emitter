import type { Factory, MapKeys, SameKeys } from "@infra-blocks/types";
import type { Events } from "./events.js";
import type { EventsListeners, ListenersInvocations } from "./listener.js";

/**
 * A {@link Factory} that produces an {@link EmitStrategy}, given an {@link EventsListeners}
 */
export type StrategyFactory<
  E extends Events,
  R extends StrategyResults<E>,
  S extends EmitStrategy<E, R>,
> = Factory<[EventsListeners<E>], S>;

/**
 * A callable type that describes an event emission strategy.
 *
 * It is paremeterized over a type that extends {@link Events}. It is generic also
 * on the return type of the strategy. Some strategies may return void, whereas
 * others may wrap the listeners in an Promise.all call or similar.
 */
export type EmitStrategy<E extends Events, R extends StrategyResults<E>> = <
  K extends keyof E,
>(
  event: K,
  ...args: Parameters<E[K]>
) => R[K];

/**
 * The default strategy used by {@link Emitter}.
 *
 * It is a callable that behaves similarly to Node.js EventEmitter's emit: it calls all
 * listeners synchronously and ignores their return values.
 *
 * The strategy also offers additional methods to emit events with different behaviors:
 * - `awaitAll`: invokes all listeners and returns their results wrapped in Promise.all
 * - `awaitAllSettled`: invokes all listeners and returns their results wrapped in Promise.allSettled
 * - `awaitEach`: invokes all listeners sequentially, awaiting each's termination before
 * invoking the following one. Their returns are ignored and a Promise<void> is returned.
 * - `ignoreEach`: invokes all listeners sequentially, ignoring their return values. This
 * is effectively the same as the main callable behavior of the strategy.
 */
export interface DefaultStrategy<
  E extends Events,
  R extends StrategyResults<E> = AlwaysVoid<E>,
> extends EmitStrategy<E, R> {
  awaitAll<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<ReturnType<E[K]>>>;
  awaitAllSettled<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<PromiseSettledResult<ReturnType<E[K]>>>>;
  awaitEach<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<void>;
}

/**
 * An invocations handler is a callable that receives the {@link ListenersInvocations}
 * and does some business with them, returning a generic type R.
 */
export type InvocationsHandler<E extends Events, R> = <K extends keyof E>(
  invocations: ListenersInvocations<E, K>,
) => R;

export function defaultStrategy<E extends Events>(
  eventsListeners: EventsListeners<E>,
): DefaultStrategy<E>;
export function defaultStrategy<E extends Events, R extends StrategyResults<E>>(
  eventsListeners: EventsListeners<E>,
  defaultInvocationsHandler: InvocationsHandler<E, R>,
): DefaultStrategy<E, R>;
export function defaultStrategy<E extends Events, R extends StrategyResults<E>>(
  eventsListeners: EventsListeners<E>,
  defaultInvocationsHandler?: InvocationsHandler<E, R>,
): DefaultStrategy<E, R> {
  const defaultHandler =
    defaultInvocationsHandler ?? (ignoreEach as InvocationsHandler<E, void>);
  const strategy = (event: keyof E, ...args: Parameters<E[typeof event]>) =>
    defaultHandler(eventsListeners.invocations(event, ...args));
  strategy.awaitAll = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ) => {
    return awaitAll(eventsListeners.invocations(event, ...args));
  };
  strategy.awaitAllSettled = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ) => {
    return awaitAllSettled(eventsListeners.invocations(event, ...args));
  };
  strategy.awaitEach = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ) => {
    return awaitEach(eventsListeners.invocations(event, ...args));
  };
  return strategy as DefaultStrategy<E, R>;
}

/**
 * Static {@link StrategyFactory} that invokes all listeners and wraps their returns
 * in a {@link Promise.all} result.
 *
 * @param eventsListeners - The events listeners providing the invocations upon
 * emission.
 * @returns An {@link EmitStrategy} that awaits all listeners resolve, the same way {@link Promise.all} does.
 */
export function awaitingAll<E extends Events>(
  eventsListeners: EventsListeners<E>,
): EmitStrategy<E, AwaitAll<E>> {
  return <K extends keyof E>(event: K, ...args: Parameters<E[K]>) =>
    awaitAll(eventsListeners.invocations(event, ...args));
}

function awaitAll<T>(results: Iterable<T>): Promise<Array<T>> {
  return Promise.all(results);
}

/**
 * Static {@link StrategyFactory} that invokes all listeners and wraps their returns
 * in a {@link Promise.allSettled} result.
 *
 * @param eventsListeners - The events listeners providing the invocations upon
 * emission.
 * @returns An {@link EmitStrategy} that awaits all listeners are settled.
 */
export function awaitingAllSettled<E extends Events>(
  eventsListeners: EventsListeners<E>,
): EmitStrategy<E, AwaitAllSettled<E>> {
  return <K extends keyof E>(event: K, ...args: Parameters<E[K]>) =>
    awaitAllSettled(eventsListeners.invocations(event, ...args));
}

function awaitAllSettled<T>(
  results: Iterable<T>,
): Promise<Array<PromiseSettledResult<T>>> {
  return Promise.allSettled(results);
}

/**
 * Static {@link StrategyFactory} that invokes listeners sequentially, awaiting
 * each listener's termination before invoking the next one.
 *
 * @param eventsListeners - The events listeners providing the invocations upon
 * emission.
 * @returns An {@link EmitStrategy} that awaits each listener's termination.
 */
export function awaitingEach<E extends Events>(
  eventsListeners: EventsListeners<E>,
): EmitStrategy<E, AlwaysPromiseVoid<E>> {
  return <K extends keyof E>(event: K, ...args: Parameters<E[K]>) =>
    awaitEach(eventsListeners.invocations(event, ...args));
}

async function awaitEach<T>(results: Iterable<T>): Promise<void> {
  for (const r of results) {
    await r;
  }
}

/**
 * Static {@link StrategyFactory} that invokes listeners synchronously and
 * ignores their return values.
 *
 * @param eventsListeners - The events listeners providing the invocations upon
 * emission.
 *
 * @returns An {@link EmitStrategy} that ignores each listener's return value.
 */
export function ignoringEach<E extends Events>(
  eventsListeners: EventsListeners<E>,
): EmitStrategy<E, AlwaysVoid<E>> {
  return <K extends keyof E>(event: K, ...args: Parameters<E[K]>) => {
    ignoreEach(eventsListeners.invocations(event, ...args));
  };
}

function ignoreEach<T>(results: Iterable<T>): void {
  for (const _ of results) {
    // Ignore the results.
  }
}

/**
 * A type meant as the super type of all strategy results mappings.
 *
 * It requires that there is a key for every key in E, but the value
 * should be the one returned by `emit`ting that event with that strategy.
 */
export type StrategyResults<E extends Events> = SameKeys<E>;

/**
 * A type mapping all events to void return type.
 *
 * This means the return value of listeners is swallowed.
 */
export type AlwaysVoid<E extends Events> = MapKeys<E, void>;

/**
 * A type mapping all events to Promise<void> return type.
 *
 * This means the return value of listeners is swallowed, but
 * they are coordinated asynchronously.
 */
export type AlwaysPromiseVoid<E extends Events> = MapKeys<E, Promise<void>>;

/**
 * A type mapping all return values of event listeners to their {@link Promise.all} equivalent.
 */
export type AwaitAll<E extends Events> = {
  [K in keyof E]: Promise<Array<ReturnType<E[K]>>>;
};

/**
 * A type mapping all return values of event listeners to their {@link Promise.allSettled} equivalent.
 */
export type AwaitAllSettled<E extends Events> = {
  [K in keyof E]: Promise<Array<PromiseSettledResult<ReturnType<E[K]>>>>;
};
