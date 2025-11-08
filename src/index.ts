import { EventEmitter } from "node:events";

/**
 * Describes the interface that "Event" types must implement.
 *
 * Every key must resolve to a callable that describes the type of the
 * handler for the event.
 */
export type Events = {
  // biome-ignore lint/suspicious/noExplicitAny: any is the only type that works with all callable signatures here.
  [key: string]: (...args: any[]) => unknown;
};

/**
 * An interface for classes that expose events for subscription,
 * but, unlike {@link EventEmitter}, does not allow client code to emit events.
 */
export interface EmitterLike<E extends Events> {
  /**
   * Subscribes a handler to the specific event type.
   *
   * @param event - The event name. This needs to be a key of the events type associated with this class.
   * @param handler - The handler function to call when the event is emitted. The type is specified by the
   * events type associated with this class at the index of the provided event name.
   */
  on<Event extends keyof E>(event: Event, handler: E[Event]): this;

  /**
   * Subscribes a one-time handler to the specific event type.
   *
   * @param event - The event name. This needs to be a key of the events type associated with this class.
   * @param handler - The handler function to call when the event is emitted. The type is specified by the
   * events type associated with this class at the index of the provided event name.
   */
  once<Event extends keyof E>(event: Event, handler: E[Event]): this;
}

/**
 * A generic implementation of {@link EmitterLike} that aims to maximize code reuse
 * and be as least intrusive as possible.
 *
 * It implements the {@link EmitterLike} interface by using an internal event
 * emitter internally, exposed to subclasses through the `protected` visibility.
 * However, it is recommended that subclasses use the {@link EmitterLikeBase.emit}
 * method instead, as it is type-safe.
 */
export class EmitterLikeBase<E extends Events> implements EmitterLike<E> {
  protected readonly emitter = new EventEmitter();

  on<Event extends keyof E>(event: Event, handler: E[Event]): this {
    this.emitter.on(event.toString(), handler);
    return this;
  }

  once<Event extends keyof E>(event: Event, handler: E[Event]): this {
    this.emitter.once(event.toString(), handler);
    return this;
  }

  /**
   * Emits the event with the given arguments.
   *
   * @param event The event. This needs to be a key of the events type associated with this class.
   * @param args The arguments to pass to the event handler. The types are inferred from the
   * handler associated with the event in the events type associated with this class.
   *
   * @returns Whether the event is being listened to.
   */
  protected emit<Event extends keyof E>(
    event: Event,
    ...args: Parameters<E[Event]>
  ): boolean {
    return this.emitter.emit(event.toString(), ...args);
  }
}
