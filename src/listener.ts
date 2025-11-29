import type { Events } from "./events.js";

interface ListenerWrapper<E extends Events, K extends keyof E> {
  invoke(...args: Parameters<E[K]>): ReturnType<E[K]>;
  is(fn: E[K]): boolean;
}

/**
 * An event listener that removes itself after being invoked once.
 */
class OnceListener<E extends Events, K extends keyof E>
  implements ListenerWrapper<E, K>
{
  private readonly fn: E[K];
  private readonly eventListeners: EventListeners<E, K>;

  private constructor(params: {
    fn: E[K];
    eventListeners: EventListeners<E, K>;
  }) {
    this.fn = params.fn;
    this.eventListeners = params.eventListeners;
  }

  invoke(...args: Parameters<E[K]>): ReturnType<E[K]> {
    const result = this.fn(...args) as ReturnType<E[K]>;
    this.eventListeners.removeListener(this.fn);
    return result;
  }

  is(fn: E[K]): boolean {
    return this.fn === fn;
  }

  static wrap<E extends Events, K extends keyof E>(params: {
    fn: E[K];
    eventListeners: EventListeners<E, K>;
  }): ListenerWrapper<E, K> {
    return new OnceListener(params);
  }
}

/**
 * An event listener that can be called multiple times.
 *
 * This is a wrapper around a normal function to implement the {@link ListenerWrapper} interface.
 */
class OnListener<E extends Events, K extends keyof E>
  implements ListenerWrapper<E, K>
{
  private readonly fn: E[K];

  private constructor(fn: E[K]) {
    this.fn = fn;
  }

  invoke(...args: Parameters<E[K]>): ReturnType<E[K]> {
    return this.fn(...args) as ReturnType<E[K]>;
  }

  is(fn: E[K]): boolean {
    return this.fn === fn;
  }

  static wrap<E extends Events, K extends keyof E>(
    fn: E[K],
  ): ListenerWrapper<E, K> {
    return new OnListener(fn);
  }
}

/**
 * A collection of listeners for a specific event.
 *
 * Not meant to be used outside this module.
 */
export class EventListeners<E extends Events, K extends keyof E> {
  private readonly listeners: Array<ListenerWrapper<E, K>>;

  private constructor() {
    this.listeners = [];
  }

  addListener(listener: E[K]): this {
    this.listeners.push(OnListener.wrap(listener));
    return this;
  }

  addOnceListener(listener: E[K]): this {
    this.listeners.push(
      OnceListener.wrap({ fn: listener, eventListeners: this }),
    );
    return this;
  }

  removeListener(listener: E[K]): this {
    const index = this.listeners.findIndex((l) => l.is(listener));
    if (index !== -1) {
      if (index === 0) {
        this.listeners.shift();
      } else {
        this.listeners.splice(index, 1);
      }
    }
    return this;
  }

  [Symbol.iterator](): Iterator<ListenerWrapper<E, K>> {
    return this.listeners[Symbol.iterator]();
  }

  static create<E extends Events, K extends keyof E>(): EventListeners<E, K> {
    return new EventListeners<E, K>();
  }
}

/**
 * An interface describing the publicly available methods for events
 * listeners.
 *
 * Events listeners are the underlying implementation that {@link Emitter}s
 * use to dispatch events emissions and registrations.
 */
export interface EventsListeners<E extends Events> {
  /**
   * Returns a lazy iterable of {@link ListenersInvocations} for the given event.
   *
   * Each item is the result of invoking a listener. Getting the result triggers
   * the invocation.
   *
   * @param event - The event that is being emitted.
   * @param params - The parameters to pass to the event listeners.
   *
   * @return A lazy iterable over the listeners invocations.
   */
  invocations<K extends keyof E>(
    event: K,
    ...params: Parameters<E[K]>
  ): ListenersInvocations<E, K>;
}

/**
 * A type describing an iterable over the results of invoking listeners
 * for a specific event.
 */
export type ListenersInvocations<
  E extends Events,
  K extends keyof E,
> = Iterable<ReturnType<E[K]>>;

// Although this class is exported, it is not part of the public API.
export class EventsListenersImpl<E extends Events>
  implements EventsListeners<E>
{
  private readonly eventsListeners: Map<keyof E, EventListeners<E, keyof E>>;

  constructor() {
    this.eventsListeners = new Map();
  }

  *invocations<K extends keyof E>(
    event: K,
    ...params: Parameters<E[K]>
  ): Iterable<ReturnType<E[K]>> {
    const eventListeners = this.eventsListeners.get(event) || [];
    for (const listener of eventListeners) {
      yield listener.invoke(...params);
    }
  }

  addListener<K extends keyof E>(event: K, listener: E[K]): void {
    const eventListeners = this.getOrSetWithDefault(event);
    eventListeners.addListener(listener);
  }

  addOnceListener<K extends keyof E>(event: K, listener: E[K]): void {
    const eventListeners = this.getOrSetWithDefault(event);
    eventListeners.addOnceListener(listener);
  }

  private getOrSetWithDefault<K extends keyof E>(
    event: K,
  ): EventListeners<E, K> {
    const eventListeners = this.eventsListeners.get(event);
    if (eventListeners != null) {
      return eventListeners;
    }
    const newEventListeners = EventListeners.create<E, K>();
    this.eventsListeners.set(event, newEventListeners);
    return newEventListeners;
  }
}
