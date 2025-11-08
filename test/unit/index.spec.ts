import { expect, sinon } from "@infra-blocks/test";
import { EmitterLikeBase } from "../../src/index.js";

describe("index", () => {
  describe("Events", () => {
    it("should work for types with callable keys", () => {
      type TestEvents = {
        ok: () => void;
        another: (value: string) => void;
        thisWorks: (value: number, other: string) => number;
      };
      // biome-ignore lint/correctness/noUnusedVariables: showcasing compilation
      class Test extends EmitterLikeBase<TestEvents> {}
    });
    it("should not work for types with non-callable keys", () => {
      type TestEvents = {
        ok: () => void;
        notOk: string;
      };
      // @ts-expect-error notOk is not callable.
      // biome-ignore lint/correctness/noUnusedVariables: showcasing lack of compilation
      class Test extends EmitterLikeBase<TestEvents> {}
    });
  });
  describe(EmitterLikeBase.name, () => {
    type TestEvents = {
      test: (message: string) => void;
    };

    class Test extends EmitterLikeBase<TestEvents> {
      triggerTest(message: string) {
        // Has access to the protected emit method.
        this.emit("test", message);
      }
    }

    describe("on", () => {
      it("should allow client code to subscribe to events", () => {
        const test = new Test();
        const handler = sinon.fake();
        test.on("test", handler);

        test.triggerTest("hello world");
        expect(handler).to.have.been.calledOnceWith("hello world");
        test.triggerTest("bye world");
        expect(handler).to.have.been.calledTwice;
        expect(handler.getCalls()[1].args).to.deep.equal(["bye world"]);
      });
    });
    describe("once", () => {
      it("should allow client code to subscribe to one-time events", () => {
        const test = new Test();
        const handler = sinon.fake();
        test.once("test", handler);

        test.triggerTest("hello world");
        expect(handler).to.have.been.calledOnceWith("hello world");
        test.triggerTest("bye world");
        // Not called again.
        expect(handler).to.have.been.calledOnce;
      });
    });
  });
});
