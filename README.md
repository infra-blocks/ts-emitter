# ts-emitter
[![Build](https://github.com/infra-blocks/ts-emitter/actions/workflows/build.yml/badge.svg)](https://github.com/infra-blocks/ts-emitter/actions/workflows/build.yml)
[![Release](https://github.com/infra-blocks/ts-emitter/actions/workflows/release.yml/badge.svg)](https://github.com/infra-blocks/ts-emitter/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/infra-blocks/ts-emitter/graph/badge.svg?token=7AFRW0XKFI)](https://codecov.io/gh/infra-blocks/ts-emitter)

This package offers utilities to maximize code reuse for classes that expose a type-safe emitter like interface for subscription only. It is common that I write code
where I'd like a class to behave like an event emitter, but hide the logic behind all the `emit` calls. This is what this package was designed for.

It defines the `EmitterLike` interface as such:
```ts
export type Events = {
  [key: string]: (...args: any[]) => unknown;
};

export interface EmitterLike<E extends Events> {
  on<Event extends keyof E>(event: Event, handler: E[Event]): this;
  once<Event extends keyof E>(event: Event, handler: E[Event]): this;
}
```

And provides a default implementation in the form of a base class named `EmitterLikeBase`. Here is a simple example usage:
```ts
// MyEmitterLike class allows subscriptions to "connect", "data" and "disconnect" events.
// NOTE: this should be a "type" and not an "interface" to get string indexing for free, although
// it is also possible with an interface (that extends Record<...>).
export type MyEvents = {
  connect: () => void;
  data: (stuff: number) => void;
  disconnect: () => void;
}

// The generics take care of the type-safety, and the emitter like boiler-plate logic
// is taken care of.
export class MyEmitterLiker extends EmitterLikeBase<MyEvents> {
  private readonly client: MyClient = new MyClient();

  async callMe() {
    await this.client.connect();
    // The `emit` method is only available within the implementer with the `protected` visibility,
    // and it is type-safe with regards to the expected handler arguments.
    this.emit("connect");
    for await (const stuff of this.client.readStuff()) {
      this.emit("stuff", stuff);
    }
    await this.client.disconnect();
    this.emit("disconnect");
  }
}

const myEmitterLike = new MyEmitterLike();
// The subscription methods are available.
myEmitterLike.once("connect", () => console.log("connected!"));
myEmitterLike.once("disconnect", () => console.log("disconnected!"));
myEmitterLike.on("data", (stuff) => console.log("received so much stuff! %d", stuff));
await myEmitterLike.callMe();
```
