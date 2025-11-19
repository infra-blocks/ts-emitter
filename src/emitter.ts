import EventEmitter from "node:events";
import type { Events } from "./events.js";
import { type EventsListeners, EventsListenersImpl } from "./listener.js";
import {
  type DefaultStrategy,
  defaultStrategy,
  type EmitStrategy,
  type InvocationsHandler,
} from "./strategies.js";

/**
 * A slightly different take on Node.js {@link EventEmitter}, with support for strategies
 * on event emission.
 */
export class Emitter<E extends Events, S extends EmitStrategy<E, unknown>> {
  private readonly eventsListeners: EventsListenersImpl<E>;
  readonly emit: S;

  protected constructor(params: {
    emit: S;
    eventsListeners: EventsListenersImpl<E>;
  }) {
    const { emit, eventsListeners } = params;
    this.eventsListeners = eventsListeners;
    this.emit = emit;
  }

  on<K extends keyof E>(event: K, listener: E[K]): this {
    this.eventsListeners.addListener(event, listener);
    return this;
  }

  once<K extends keyof E>(event: K, listener: E[K]): this {
    this.eventsListeners.addOnceListener(event, listener);
    return this;
  }

  static create<E extends Events>(): Emitter<E, DefaultStrategy<E, void>> {
    return Emitter.withStrategy(defaultStrategy<E>);
  }

  static withStrategy<E extends Events, S extends EmitStrategy<E, unknown>>(
    strategy: (eventsListeners: EventsListeners<E>) => S,
  ): Emitter<E, S> {
    const eventsListeners = new EventsListenersImpl<E>();
    return new Emitter({
      emit: strategy(eventsListeners),
      eventsListeners,
    });
  }

  static withDefaultInvocationsHandler<E extends Events, R>(
    invocationsHandler: InvocationsHandler<E, R>,
  ): Emitter<E, DefaultStrategy<E, R>> {
    return Emitter.withStrategy((el) =>
      defaultStrategy(el, invocationsHandler),
    );
  }
}
