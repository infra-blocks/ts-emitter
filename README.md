# ts-emitter
[![Build](https://github.com/infra-blocks/ts-emitter/actions/workflows/build.yml/badge.svg)](https://github.com/infra-blocks/ts-emitter/actions/workflows/build.yml)
[![Release](https://github.com/infra-blocks/ts-emitter/actions/workflows/release.yml/badge.svg)](https://github.com/infra-blocks/ts-emitter/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/infra-blocks/ts-emitter/graph/badge.svg?token=7AFRW0XKFI)](https://codecov.io/gh/infra-blocks/ts-emitter)

This package contains a few type safe emitter related utilites. First, it does expose yet another freaking emitter. It also offers various types, such as the `EmitterLike`
interface, to maximize code reuse across projects. There is also a base class that client code can implement to automatically inherit the `on` and `once`
methods, properly typed.

## Another emitter

Why? Because I thought that the Node.js packaged one lacked some features (async emission, for example), and the ones I'd been looking at
in other NPM packages were missing just a little bit of stuff. I don't claim that this is the best, nor the fastest event emitter (although
it is quite simple in its implementation, so it could be among the fastest). I do claim, however, that it is configurable as fuck.

### No nonsense (Keith Peterson)

The only methods we keep from the Node.js interface are `on`, `once` and `emit`. We do away with the aliases (such as `addListener`)
and pretty much every other method I've never actually had to use in my career.

The default behavior when emitting an `error` event without any listener registered is the same as any other fucking event:
nothing happens. There. Not trying to be smart here.

### Emit as a dependency injection

This emitter is designed such that the `emit` method can be easily switched out to change the semantics. By default, when
using the base factory function, it behaves just like the Node.js one: when an event is emitted, listeners are called
in sequence and their results are completely ignored (vanilla behavior before the support for handling rejections).

```typescript
import { Emitter } from "@infra-blocks/emitter";

type MyEvents = {
  gogo: (gadget: string) => void;
}

const emitter = Emitter.create<MyEvents>();
emitter.on("gogo", (gadget) => console.log("gadget is: ", gadget));
emitter.on("gogo", () => console.log("was that show ever good?"));
emitter.emit("gogo", "retractablePenus");

// Prints out:
// gadget is: retractablePenus
// was that show ever good?
```

In addition, the default strategy also exports weird members on emit, just to showcase what you could do yourself
if you wanted to support more than one strategy for the same emitter.

```typescript
// Wraps all listener results in a Promise.all and returns that.
const results = await emitter.emit.awaitAll("gogo", "retractablePenus");
// Same but for Promise.allSettled. Try it. The typing works esé.
const results = await emitter.emit.awaitAllSettled("gogo", "retractablePenus");
// They are executed one at a time, when a listener is only invoked if all
// previous listeners have already resolved.
await emitter.emit.awaitEach("gogo", "retractablePenus");
```

If you know you always want the `awaitAll` logic, for example, and don't want the weird `emit` attributes, you
can also create an emitter that does only that:

```typescript
type MyEvents = {
  // Does something asynchronous with the poop quantity.
  poop: (quantityInLitres: number) => Promise<boolean>;
}

const emitter = Emitter.awaitingAll<MyEvents>();
// ...
const results: Array<boolean> = await emitter.emit("poop", 2.3); // My kid shits a lot. Notice how emit now returns a promise?
```

You can customize the behavior of `emit` and its typing. For example you could have different strategy
on different events, by doing so:

```typescript
type Events = {
  left: () => number;
  right: (v: number) => string;
};

type Results = {
  left: undefined; // We will ignore the return values.
  right: Promise<string[]>; // We will Promise.all them here.
};

const emitter = Emitter.withStrategyFactory<
  Events,
  Results,
  EmitStrategy<Events, Results>
>((listeners) => {
  return <K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ) => {
    // Typescript needs a little help with the return typing.
    switch (event) {
      case "left":
        // Fire the listeners and ignore their results.
        for (const _ of listeners.invocations(event, ...args)) {
        }
        return undefined as Results[K];
      case "right":
        return Promise.all(
          listeners.invocations(event, ...args),
        ) as unknown as Results[K];
    }
  };
});

const left = emitter.emit("left"); // Type of left is undefined.
const right = emitter.emit("right", ...); // Type of right is Promise<string[]>
```

Nuff said about that emitter.

## EmitterLike interface

The `EmitterLike` interface is defined as such:
```ts
export type Events = {
  [key: string]: (...args: any[]) => unknown;
};

export interface EmitterLike<E extends Events> {
  on<Event extends keyof E>(event: Event, handler: E[Event]): this;
  once<Event extends keyof E>(event: Event, handler: E[Event]): this;
}
```

It's basically to provide a common interface for classes that support event registration, but handle emission internally. The interface
is automatically type safe with regards to the event type.

## EmitterLikeBase base classes

In addition, base classes are provided to implement the `EmitterLike` interface with straightforward implementations.
`EmitterLikeBase` is a simple base class with an emitter that re-exports the `emit` function to its subclasses with `protected`
visibility, and implements the `EmitterLike` interface by dispatching to the internal emitter.

Here is a simple example usage:
```ts
// MyEmitterLike class allows subscriptions to "connect", "data" and "disconnect" events.
// NOTE: this should be a "type" and not an "interface" to get string indexing for free, although
// it is also possible with an interface (that extends Record<...>).
export type MyEvents = {
  connect: () => void;
  data: (stuff: number) => Promise<void>;
  disconnect: () => void;
}

// The generics take care of the type-safety, and the emitter like boiler-plate logic
// is taken care of.
export class MyEmitterLiker extends EmitterLikeBase<MyEvents, DefaultStrategy<MyEvents, AlwaysVoid<MyEvents>>> {
  private readonly client: MyClient;

  constructor() {
    super({ emitter: Emitter.create<MyEvents>() })
    this.client = new MyClient();
  }
  
  async callMe() {
    await this.client.connect();
    // The `emit` method is only available within the implementer with the `protected` visibility,
    // and it is type-safe with regards to the expected handler arguments.
    this.emit("connect");
    for await (const stuff of this.client.readStuff()) {
      // The same emit methods that the emitter supports are offered in the subclass.
      await this.emit.awaitEach("data", stuff);
    }
    await this.client.disconnect();
    this.emit("disconnect");
  }
}

const myEmitterLike = new MyEmitterLike();
// The subscription methods are available.
myEmitterLike.once("connect", () => console.log("connected!"));
myEmitterLike.once("disconnect", () => console.log("disconnected!"));
myEmitterLike.on("data", async (stuff) => await db.storeStuff(stuff));
await myEmitterLike.callMe();
```

`EmitterLikeBase` is at the top of the hierarchy, and allows maximum configuration. If you're using one of
the provided strategies, a matching base class exists as well to minimize that pesky fucking typing:
```typescript
// As above
export class MyEmitterLiker extends EmitterLikeBase<MyEvents, DefaultStrategy<MyEvents, AlwaysVoid<MyEvents>>> {
  constructor() {
    super({ emitter: Emitter.create<MyEvents>() })
  }
}

// Can be rewritten as:
export class MyEmitterLiker extends DefaultStrategyEmitterLikeBase<MyEvents> {
  // No need to call the super constructor.
}
```
