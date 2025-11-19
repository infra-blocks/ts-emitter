import { expect, sinon } from "@infra-blocks/test";
import { Emitter } from "../../src/index.js";

describe("emitter", () => {
  describe("default strategy", () => {
    it("should not crash when emitting an error event without listener", () => {
      const emitter = Emitter.create();
      emitter.emit("error", new Error("Test error"));
    });
    it("should forward emitted events to listeners", () => {
      type TestEvents = {
        stuff: (data: number) => void;
      };
      const emitter = Emitter.create<TestEvents>();
      const handler = sinon.fake();
      emitter.on("stuff", handler);
      emitter.emit("stuff", 42);
      expect(handler).to.have.been.calledOnceWithExactly(42);
    });
  });
});
