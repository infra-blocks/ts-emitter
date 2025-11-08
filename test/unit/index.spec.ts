import { expect, sinon } from "@infra-blocks/test";
import { EmitterLikeBase } from "../../src/index.js";

describe("index", () => {
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
