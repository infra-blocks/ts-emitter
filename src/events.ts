/**
 * Describes the structure that "Event" types must implement.
 *
 * Every key must resolve to a callable that describes the type of the
 * handler for the event.
 */
export type Events = {
  [key: string]: Listener;
};

/**
 * A generic callable type that describes event listener functions.
 *
 * Listeners can take any amount of parameters and return any type, including
 * promises. Whether those are ignored or awaited depends on the strategy
 * used when emitting the event.
 */
// biome-ignore lint/suspicious/noExplicitAny: any is the only type that works with all callable signatures here.
export type Listener = (...args: any[]) => unknown;
