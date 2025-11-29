import { expect, sinon } from "@infra-blocks/test";
import { injectFakeTimersFixtures } from "@infra-blocks/test/mocha/bdd";
import { Emitter } from "../../src/index.js";

describe("emitter", () => {
  describe("default strategy", () => {
    it("should not crash when emitting an error event without listener", async () => {
      const emitter = Emitter.create();
      emitter.emit("error", new Error("Test error"));
      await emitter.emit.awaitAll("error", new Error("Test error"));
      await emitter.emit.awaitAllSettled("error", new Error("Test error"));
      await emitter.emit.awaitEach("error", new Error("Test error"));
    });
    // The default strategy is the same as ignoreEach.
    describe("default invocation", () => {
      it("should forward emitted events to multiple listeners synchronously", () => {
        type TestEvents = {
          // Notice how the promises are be ignored.
          stuff: (data: number) => Promise<void>;
        };
        const emitter = Emitter.create<TestEvents>();
        // That promise never resolves.
        const firstListener = sinon.fake.returns(new Promise<void>(() => {}));
        const secondListener = sinon.fake.returns(new Promise<void>(() => {}));
        const thirdListener = sinon.fake.returns(new Promise<void>(() => {}));
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        emitter.emit("stuff", 42);
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
      });
      it("should forward emitted events to listeners multiple times", () => {
        type TestEvents = {
          stuff: (data: number) => void;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake();
        const secondListener = sinon.fake();
        const thirdListener = sinon.fake();
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        emitter.emit("stuff", 42);
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
        emitter.emit("stuff", 69);
        expect(firstListener).to.have.been.calledTwice;
        expect(firstListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(secondListener).to.have.been.calledTwice;
        expect(secondListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(thirdListener).to.have.been.calledTwice;
        expect(thirdListener.getCall(1)).to.have.been.calledWithExactly(69);
      });
      it("should remove once listener after being called once", () => {
        type TestEvents = {
          stuff: (data: number) => void;
        };
        const emitter = Emitter.create<TestEvents>();
        const listener = sinon.fake();
        emitter.on("stuff", listener);
        emitter.emit("stuff", 42);
        expect(listener).to.have.been.calledOnceWithExactly(42);
        const onceListener = sinon.fake();
        emitter.once("stuff", onceListener);
        emitter.emit("stuff", 69);
        expect(listener).to.have.been.calledTwice;
        expect(listener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(onceListener).to.have.been.calledOnceWithExactly(69);
        emitter.emit("stuff", 420);
        expect(listener).to.have.been.calledThrice;
        expect(listener.getCall(2)).to.have.been.calledWithExactly(420);
        // No extra calls.
        expect(onceListener).to.have.been.calledOnce;
      });
      it("should bottle up synchronous errors to the caller", () => {
        type TestEvents = {
          // Notice how the promises are be ignored.
          stuff: (data: number) => Promise<void>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.throws(new Error("Handle it!"));
        const secondListener = sinon.fake.returns(new Promise<void>(() => {}));
        const thirdListener = sinon.fake.returns(new Promise<void>(() => {}));
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        expect(() => emitter.emit("stuff", 42)).to.throw();
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.not.have.been.called;
        expect(thirdListener).to.not.have.been.called;
      });
    });
    describe("awaitAll", () => {
      it("should return an await all promise that captures all listeners", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        const results = await emitter.emit.awaitAll("stuff", 42);
        expect(results).to.deep.equal([1, 2, 3]);
      });
      it("should forward emitted events to listeners multiple times", async () => {
        type TestEvents = {
          // Listeners don't have to return promises.
          stuff: (data: number) => number;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.returns(1);
        const secondListener = sinon.fake.returns(2);
        const thirdListener = sinon.fake.returns(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        let results = await emitter.emit.awaitAll("stuff", 42);
        expect(results).to.deep.equal([1, 2, 3]);
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
        results = await emitter.emit.awaitAll("stuff", 69);
        expect(results).to.deep.equal([1, 2, 3]);
        expect(firstListener).to.have.been.calledTwice;
        expect(firstListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(secondListener).to.have.been.calledTwice;
        expect(secondListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(thirdListener).to.have.been.calledTwice;
        expect(thirdListener.getCall(1)).to.have.been.calledWithExactly(69);
      });
      it("should remove once listener after being called once", async () => {
        type TestEvents = {
          stuff: (data: number) => number;
        };
        const emitter = Emitter.create<TestEvents>();
        const listener = sinon.fake.returns(1);
        emitter.on("stuff", listener);
        let results = await emitter.emit.awaitAll("stuff", 42);
        expect(results).to.deep.equal([1]);
        expect(listener).to.have.been.calledOnceWithExactly(42);
        const onceListener = sinon.fake.returns(2);
        emitter.once("stuff", onceListener);
        results = await emitter.emit.awaitAll("stuff", 69);
        expect(results).to.deep.equal([1, 2]);
        expect(listener).to.have.been.calledTwice;
        expect(listener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(onceListener).to.have.been.calledOnceWithExactly(69);
        results = await emitter.emit.awaitAll("stuff", 420);
        expect(results).to.deep.equal([1]);
        expect(listener).to.have.been.calledThrice;
        expect(listener.getCall(2)).to.have.been.calledWithExactly(420);
        // No extra calls.
        expect(onceListener).to.have.been.calledOnce;
      });
      it("should reject for synchronous errors", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.throws(new Error("Handle it!"));
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await expect(emitter.emit.awaitAll("stuff", 42)).to.be.rejected;
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.not.have.been.called;
        expect(thirdListener).to.not.have.been.called;
      });
      it("should reject if any listener promise rejects", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const secondListener = sinon.fake.rejects(new Error("Handle it!"));
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await expect(emitter.emit.awaitAll("stuff", 42)).to.be.rejected;
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
      });
    });
    describe("awaitAllSettled", () => {
      it("should return an await all settled promise that captures all listeners", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        const results = await emitter.emit.awaitAllSettled("stuff", 42);
        expect(results).to.deep.equal([
          { status: "fulfilled", value: 1 },
          { status: "fulfilled", value: 2 },
          { status: "fulfilled", value: 3 },
        ]);
      });
      it("should forward emitted events to listeners multiple times", async () => {
        type TestEvents = {
          // Listeners don't have to return promises.
          stuff: (data: number) => number;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.returns(1);
        const secondListener = sinon.fake.returns(2);
        const thirdListener = sinon.fake.returns(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        let results = await emitter.emit.awaitAllSettled("stuff", 42);
        expect(results).to.deep.equal([
          { status: "fulfilled", value: 1 },
          { status: "fulfilled", value: 2 },
          { status: "fulfilled", value: 3 },
        ]);
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
        results = await emitter.emit.awaitAllSettled("stuff", 69);
        expect(results).to.deep.equal([
          { status: "fulfilled", value: 1 },
          { status: "fulfilled", value: 2 },
          { status: "fulfilled", value: 3 },
        ]);
        expect(firstListener).to.have.been.calledTwice;
        expect(firstListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(secondListener).to.have.been.calledTwice;
        expect(secondListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(thirdListener).to.have.been.calledTwice;
        expect(thirdListener.getCall(1)).to.have.been.calledWithExactly(69);
      });
      it("should remove once listener after being called once", async () => {
        type TestEvents = {
          stuff: (data: number) => number;
        };
        const emitter = Emitter.create<TestEvents>();
        const listener = sinon.fake.returns(1);
        emitter.on("stuff", listener);
        let results = await emitter.emit.awaitAllSettled("stuff", 42);
        expect(results).to.deep.equal([{ status: "fulfilled", value: 1 }]);
        expect(listener).to.have.been.calledOnceWithExactly(42);
        const onceListener = sinon.fake.returns(2);
        emitter.once("stuff", onceListener);
        results = await emitter.emit.awaitAllSettled("stuff", 69);
        expect(results).to.deep.equal([
          { status: "fulfilled", value: 1 },
          { status: "fulfilled", value: 2 },
        ]);
        expect(listener).to.have.been.calledTwice;
        expect(listener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(onceListener).to.have.been.calledOnceWithExactly(69);
        results = await emitter.emit.awaitAllSettled("stuff", 420);
        expect(results).to.deep.equal([{ status: "fulfilled", value: 1 }]);
        expect(listener).to.have.been.calledThrice;
        expect(listener.getCall(2)).to.have.been.calledWithExactly(420);
        // No extra calls.
        expect(onceListener).to.have.been.calledOnce;
      });
      it("should be interrupted by synchronous errors", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.throws(new Error("Handle it!"));
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await expect(emitter.emit.awaitAllSettled("stuff", 42)).to.be.rejected;
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.not.have.been.called;
        expect(thirdListener).to.not.have.been.called;
      });
      it("should reject if any listener promise rejects", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const error = new Error("Handle it!");
        const secondListener = sinon.fake.rejects(error);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        const results = await emitter.emit.awaitAllSettled("stuff", 42);
        expect(results).to.deep.equal([
          { status: "fulfilled", value: 1 },
          { status: "rejected", reason: error },
          { status: "fulfilled", value: 3 },
        ]);
      });
    });
    describe("awaitEach", () => {
      describe("", () => {
        injectFakeTimersFixtures();

        it("should await resolution between each listener", async function () {
          type TestEvents = {
            stuff: (data: number) => Promise<number>;
          };
          const emitter = Emitter.create<TestEvents>();
          let firstListenerResolve: (value: number) => void;
          const firstListener = sinon.fake.returns(
            new Promise<number>((resolve) => {
              firstListenerResolve = resolve;
            }),
          );
          let secondListenerResolve: (value: number) => void;
          const secondListener = sinon.fake.returns(
            new Promise<number>((resolve) => {
              secondListenerResolve = resolve;
            }),
          );
          const thirdListener = sinon.fake.resolves(3);
          emitter
            .on("stuff", firstListener)
            .on("stuff", secondListener)
            .on("stuff", thirdListener);
          const resultsPromise = emitter.emit.awaitEach("stuff", 42);
          await this.clock.runAllAsync();
          expect(firstListener).to.have.been.calledOnceWithExactly(42);
          expect(secondListener).to.not.have.been.called;
          expect(thirdListener).to.not.have.been.called;
          // biome-ignore lint/style/noNonNullAssertion: the value is definitely set.
          firstListenerResolve!(1);
          await this.clock.runAllAsync();
          expect(secondListener).to.have.been.calledOnceWithExactly(42);
          expect(thirdListener).to.not.have.been.called;
          // biome-ignore lint/style/noNonNullAssertion: the value is definitely set.
          secondListenerResolve!(2);
          await this.clock.runAllAsync();
          expect(thirdListener).to.have.been.calledOnceWithExactly(42);
          await resultsPromise;
        });
      });

      it("should forward emitted events to listeners multiple times", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await emitter.emit.awaitEach("stuff", 42);
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.have.been.calledOnceWithExactly(42);
        await emitter.emit.awaitEach("stuff", 69);
        expect(firstListener).to.have.been.calledTwice;
        expect(firstListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(secondListener).to.have.been.calledTwice;
        expect(secondListener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(thirdListener).to.have.been.calledTwice;
        expect(thirdListener.getCall(1)).to.have.been.calledWithExactly(69);
      });
      it("should remove once listener after being called once", async () => {
        type TestEvents = {
          // Listeners don't have to return promises.
          stuff: (data: number) => number;
        };
        const emitter = Emitter.create<TestEvents>();
        const listener = sinon.fake.returns(1);
        emitter.on("stuff", listener);
        await emitter.emit.awaitEach("stuff", 42);
        expect(listener).to.have.been.calledOnceWithExactly(42);
        const onceListener = sinon.fake.returns(2);
        emitter.once("stuff", onceListener);
        await emitter.emit.awaitEach("stuff", 69);
        expect(listener).to.have.been.calledTwice;
        expect(listener.getCall(1)).to.have.been.calledWithExactly(69);
        expect(onceListener).to.have.been.calledOnceWithExactly(69);
        await emitter.emit.awaitEach("stuff", 420);
        expect(listener).to.have.been.calledThrice;
        expect(listener.getCall(2)).to.have.been.calledWithExactly(420);
        // No extra calls.
        expect(onceListener).to.have.been.calledOnce;
      });
      it("should be interrupted by synchronous errors", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.throws(new Error("Handle it!"));
        const secondListener = sinon.fake.resolves(2);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await expect(emitter.emit.awaitEach("stuff", 42)).to.be.rejected;
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.not.have.been.called;
        expect(thirdListener).to.not.have.been.called;
      });
      it("should reject if any listener promise rejects", async () => {
        type TestEvents = {
          stuff: (data: number) => Promise<number>;
        };
        const emitter = Emitter.create<TestEvents>();
        const firstListener = sinon.fake.resolves(1);
        const error = new Error("Handle it!");
        const secondListener = sinon.fake.rejects(error);
        const thirdListener = sinon.fake.resolves(3);
        emitter
          .on("stuff", firstListener)
          .on("stuff", secondListener)
          .on("stuff", thirdListener);
        await expect(emitter.emit.awaitEach("stuff", 42)).to.be.rejected;
        expect(firstListener).to.have.been.calledOnceWithExactly(42);
        expect(secondListener).to.have.been.calledOnceWithExactly(42);
        expect(thirdListener).to.not.have.been.called;
      });
    });
  });
});
