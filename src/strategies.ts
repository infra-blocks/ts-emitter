import type { Events } from "./events.js";
import type { EventsListeners, ListenersInvocations } from "./listener.js";

export type EmitStrategy<E extends Events, R> = <K extends keyof E>(
  event: K,
  ...args: Parameters<E[K]>
) => R;

export interface DefaultStrategy<E extends Events, R>
  extends EmitStrategy<E, R> {
  awaitAll<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<ReturnType<E[K]>>>;
  awaitAllSettled<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<PromiseSettledResult<ReturnType<E[K]>>>>;
  awaitingEach<K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<ReturnType<E[K]>>>;
  ignoringEach<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void;
}

export type InvocationsHandler<E extends Events, R> = <K extends keyof E>(
  invocations: ListenersInvocations<E, K>,
) => R;

export function defaultStrategy<E extends Events>(
  eventsListeners: EventsListeners<E>,
): DefaultStrategy<E, void>;
export function defaultStrategy<E extends Events, R>(
  eventsListeners: EventsListeners<E>,
  defaultInvocationsHandler: InvocationsHandler<E, R>,
): DefaultStrategy<E, R>;
export function defaultStrategy<E extends Events, R>(
  eventsListeners: EventsListeners<E>,
  defaultInvocationsHandler?: InvocationsHandler<E, R>,
): DefaultStrategy<E, R> {
  const defaultHandler =
    defaultInvocationsHandler ?? (ignoreEach as InvocationsHandler<E, void>);
  const strategy = (event: keyof E, ...args: Parameters<E[typeof event]>) =>
    defaultHandler(eventsListeners.listenersInvocations(event, ...args));
  strategy.awaitAll = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<ReturnType<E[K]>>> => {
    return awaitAll(eventsListeners.listenersInvocations(event, ...args));
  };
  strategy.awaitAllSettled = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<PromiseSettledResult<ReturnType<E[K]>>>> => {
    return awaitAllSettled(
      eventsListeners.listenersInvocations(event, ...args),
    );
  };
  strategy.awaitingEach = async <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): Promise<Array<ReturnType<E[K]>>> => {
    return awaitEach(eventsListeners.listenersInvocations(event, ...args));
  };
  strategy.ignoringEach = <K extends keyof E>(
    event: K,
    ...args: Parameters<E[K]>
  ): void => {
    ignoreEach(eventsListeners.listenersInvocations(event, ...args));
  };
  return strategy as DefaultStrategy<E, R>;
}

function awaitAll<T>(results: Iterable<T>): Promise<Array<T>> {
  return Promise.all(results);
}

function awaitAllSettled<T>(
  results: Iterable<T>,
): Promise<Array<PromiseSettledResult<T>>> {
  return Promise.allSettled(results);
}

async function awaitEach<T>(results: Iterable<T>): Promise<Array<T>> {
  const result = [];
  for (const r of results) {
    result.push(await r);
  }
  return result;
}

function ignoreEach<T>(results: Iterable<T>): void {
  for (const _ of results) {
    // Ignore the results.
  }
}
