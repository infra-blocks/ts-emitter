import { Emitter } from "./emitter.js";
import type { Events } from "./events.js";
import type {
  AlwaysPromiseVoid,
  AlwaysVoid,
  AwaitAll,
  AwaitAllSettled,
  DefaultStrategy,
  EmitStrategy,
  StrategyResults,
} from "./strategies.js";

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
 *
 * The type-safe `emit` method is directly exposed to subclasses with the `protected`
 * visibility modifier. Subclasses can call `this.emit(...)` to emit events, which
 * is not available in the public API of this class.
 */
export abstract class EmitterLikeBase<
  E extends Events,
  S extends EmitStrategy<E, StrategyResults<E>>,
> implements EmitterLike<E>
{
  protected readonly emit: S;
  private readonly emitter: Emitter<E, S>;

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

/**
 * A convenience on top of {@link EmitterLikeBase} that uses the default strategy.
 */
export abstract class DefaultStrategyEmitterLikeBase<
  E extends Events,
> extends EmitterLikeBase<E, DefaultStrategy<E>> {
  protected constructor() {
    super({ emitter: Emitter.create() });
  }
}

/**
 * A convenience on top of {@link EmitterLikeBase} that uses the ignoring-each strategy.
 */
export class IgnoringEachEmitterLikeBase<
  E extends Events,
> extends EmitterLikeBase<E, EmitStrategy<E, AlwaysVoid<E>>> {
  protected constructor() {
    super({ emitter: Emitter.ignoringEach() });
  }
}

/**
 * A convenience on top of {@link EmitterLikeBase} that uses the awaiting-each strategy.
 */
export abstract class AwaitingEachEmitterLikeBase<
  E extends Events,
> extends EmitterLikeBase<E, EmitStrategy<E, AlwaysPromiseVoid<E>>> {
  protected constructor() {
    super({ emitter: Emitter.awaitingEach() });
  }
}

/**
 * A convenience on top of {@link EmitterLikeBase} that uses the awaiting-all strategy.
 */
export abstract class AwaitingAllEmitterLikeBase<
  E extends Events,
> extends EmitterLikeBase<E, EmitStrategy<E, AwaitAll<E>>> {
  protected constructor() {
    super({ emitter: Emitter.awaitingAll() });
  }
}

/**
 * A convenience on top of {@link EmitterLikeBase} that uses the awaiting-all-settled strategy.
 */
export abstract class AwaitingAllSettledEmitterLikeBase<
  E extends Events,
> extends EmitterLikeBase<E, EmitStrategy<E, AwaitAllSettled<E>>> {
  protected constructor() {
    super({ emitter: Emitter.awaitingAllSettled() });
  }
}
