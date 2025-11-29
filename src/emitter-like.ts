import type { Emitter } from "./emitter.js";
import type { Events } from "./events.js";
import type { EmitStrategy, StrategyResults } from "./strategies.js";

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
 * It implements the {@link EmitterLike} interface by using an internal {@link Emitter}
 * that is passed by the subclass through the constructor.
 */
export class EmitterLikeBase<
  E extends Events,
  S extends EmitStrategy<E, StrategyResults<E>>,
> implements EmitterLike<E>
{
  protected readonly emitter: Emitter<E, S>;
  protected readonly emit: S;

  protected constructor(params: { emitter: Emitter<E, S> }) {
    const { emitter } = params;
    this.emitter = emitter;
    this.emit = emitter.emit;
  }

  on<K extends keyof E>(event: K, listener: E[K]): this {
    this.emitter.on(event, listener);
    return this;
  }

  once<K extends keyof E>(event: K, listener: E[K]): this {
    this.emitter.once(event, listener);
    return this;
  }
}
