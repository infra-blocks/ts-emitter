import type { Events } from "./events.js";
import { EventsListenersImpl } from "./listener.js";
import {
  type AlwaysPromiseVoid,
  type AlwaysVoid,
  type AwaitAll,
  type AwaitAllSettled,
  awaitingAll,
  awaitingAllSettled,
  awaitingEach,
  type DefaultStrategy,
  defaultStrategy,
  type EmitStrategy,
  ignoringEach,
  type StrategyFactory,
  type StrategyResults,
} from "./strategies.js";

/**
 * A slightly different take on Node.js {@link EventEmitter}, with support for strategies
 * on event emission.
 */
export class Emitter<
  E extends Events,
  S extends EmitStrategy<E, StrategyResults<E>>,
> {
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

  /**
   * Registers a listener for the given event.
   *
   * Listeners are invoked in the order they are registered. How listeners are invoked
   * depends on the strategy attached to the emitter.
   *
   * @param event - The event to listen to.
   * @param listener - The listener to invoke when the event is emitted.
   *
   * @returns The emitter instance.
   */
  on<K extends keyof E>(event: K, listener: E[K]): this {
    this.eventsListeners.addListener(event, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the given event.
   *
   * How listeners are invoked depends on the strategy attached to the emitter.
   * Regardless of the emission strategy, this listener is removed after
   * its first invocation.
   *
   * @param event - The event to listen to.
   * @param listener - The listener to invoke when the event is emitted.
   *
   * @returns The emitter instance.
   */
  once<K extends keyof E>(event: K, listener: E[K]): this {
    this.eventsListeners.addOnceListener(event, listener);
    return this;
  }

  /**
   * Creates an {@link Emitter} with the {@link DefaultStrategy}.
   *
   * Equivalent to `Emitter.withStrategyProvider(defaultStrategy)`.
   *
   * @returns An {@link Emitter} that uses the default strategy.
   */
  static create<E extends Events>(): Emitter<
    E,
    DefaultStrategy<E, AlwaysVoid<E>>
  > {
    return Emitter.withStrategyFactory(defaultStrategy<E>);
  }

  /**
   * Creates an {@link Emitter} that invokes listeners synchronously and ignores their return
   * values.
   *
   * This is similar behavior to Node.js EventEmitter's `emit` method. It is also
   * the default callable behavior of the {@link DefaultStrategy}.
   *
   * However, unlike {@link Emitter.create}, the emitter returned *only* supports this
   * strategy.
   *
   * This is the same as calling `Emitter.withStrategyProvider(ignoringEach)`.
   *
   * @returns An {@link Emitter} that uses the ignoring each strategy.
   */
  static ignoringEach<E extends Events>(): Emitter<
    E,
    EmitStrategy<E, AlwaysVoid<E>>
  > {
    return Emitter.withStrategyFactory(ignoringEach);
  }

  /**
   * Creates an {@link Emitter} that invokes listeners sequentially, awaiting each's
   * termination before invoking the following one.
   *
   * This is the same as calling `Emitter.withStrategyProvider(awaitingEach)`.
   *
   * @returns An {@link Emitter} that uses the awaiting each strategy.
   */
  static awaitingEach<E extends Events>(): Emitter<
    E,
    EmitStrategy<E, AlwaysPromiseVoid<E>>
  > {
    return Emitter.withStrategyFactory(awaitingEach);
  }

  /**
   * Creates an {@link Emitter} that invokes all listeners and wraps their results
   * in a {@link Promise.all}.
   *
   * This is the same as calling `Emitter.withStrategyProvider(awaitingAll)`.
   *
   * @returns An {@link Emitter} that uses the awaiting all strategy.
   */
  static awaitingAll<E extends Events>(): Emitter<
    E,
    EmitStrategy<E, AwaitAll<E>>
  > {
    return Emitter.withStrategyFactory(awaitingAll);
  }

  /**
   * Creates an {@link Emitter} that invokes all listeners and wraps their returns
   * in a {@link Promise.allSettled}.
   *
   * This is the same as calling `Emitter.withStrategyProvider(awaitingAllSettled)`.
   *
   * @returns An {@link Emitter} that uses the awaiting all settled strategy.
   */
  static awaitingAllSettled<E extends Events>(): Emitter<
    E,
    EmitStrategy<E, AwaitAllSettled<E>>
  > {
    return Emitter.withStrategyFactory(awaitingAllSettled);
  }

  /**
   * Creates an {@link Emitter} with a custom strategy factory.
   *
   * The events listeners are instantiated internally and the factory is invoked
   * once on those, producing the strategy that will be attached to the emitter.
   *
   * @param strategyFactory - The factory that will produce the strategy attached
   * to the emitter.
   * @returns An {@link Emitter} that uses the provided strategy.
   */
  static withStrategyFactory<
    E extends Events,
    R extends StrategyResults<E>,
    S extends EmitStrategy<E, R>,
  >(strategyFactory: StrategyFactory<E, R, S>): Emitter<E, S> {
    const eventsListeners = new EventsListenersImpl<E>();
    return new Emitter({
      emit: strategyFactory(eventsListeners),
      eventsListeners,
    });
  }
}
