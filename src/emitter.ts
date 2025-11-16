import EventEmitter from "node:events";
import type { Events } from "./index.js";
import { ignoreEach, type Strategy } from "./strategies.js";

interface Listener<E extends Events, K extends keyof E> {
  invoke(...args: Parameters<E[K]>): ReturnType<E[K]>;
  is(fn: E[K]): boolean;
}

class OnceListener<E extends Events, K extends keyof E>
  implements Listener<E, K>
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
  }): Listener<E, K> {
    return new OnceListener(params);
  }
}

class OnListener<E extends Events, K extends keyof E>
  implements Listener<E, K>
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

  static wrap<E extends Events, K extends keyof E>(fn: E[K]): Listener<E, K> {
    return new OnListener(fn);
  }
}

class EventListeners<E extends Events, K extends keyof E> {
  private readonly listeners: Array<Listener<E, K>>;

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

  emitWithStrategy<T>(
    strategy: (results: Iterable<ReturnType<E[K]>>) => T,
    ...args: Parameters<E[K]>
  ): T {
    const listeners = this.listeners;
    const resultsIterable = function* () {
      for (const listener of listeners) {
        yield listener.invoke(...args);
      }
    };

    return strategy(resultsIterable());
  }

  [Symbol.iterator](): Iterator<Listener<E, K>> {
    return this.listeners[Symbol.iterator]();
  }

  static create<E extends Events, K extends keyof E>(): EventListeners<E, K> {
    return new EventListeners<E, K>();
  }
}

/**
 * A slightly different take on Node.js {@link EventEmitter}, with support for strategies
 * on event emission.
 */
export class Emitter<E extends Events> {
  private readonly eventsListeners: Map<keyof E, EventListeners<E, keyof E>>;

  protected constructor() {
    this.eventsListeners = new Map();
  }

  on<K extends keyof E>(event: K, handler: E[K]): this {
    const eventListeners =
      this.eventsListeners.get(event) ?? EventListeners.create();
    eventListeners.addListener(handler);
    this.eventsListeners.set(event, eventListeners);
    return this;
  }

  once<K extends keyof E>(event: K, handler: E[K]): this {
    const eventListeners =
      this.eventsListeners.get(event) ?? EventListeners.create();
    eventListeners.addOnceListener(handler);
    this.eventsListeners.set(event, eventListeners);
    return this;
  }

  emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void {
    this.emitWithStrategy(ignoreEach, event, ...args);
  }
  emitWithStrategy<K extends keyof E, T>(
    strategy: Strategy<ReturnType<E[K]>, T>,
    event: K,
    ...args: Parameters<E[K]>
  ): T {
    const eventListeners =
      this.eventsListeners.get(event) ?? EventListeners.create();
    return eventListeners.emitWithStrategy(strategy, ...args);
  }

  static create<E extends Events>(): Emitter<E> {
    return new Emitter<E>();
  }
}
