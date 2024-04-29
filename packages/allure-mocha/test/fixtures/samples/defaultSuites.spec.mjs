import { describe, it } from "mocha";

it("root", async () => {});

describe("suite 1", async () => {
  it("first", async () => {});
  describe("suite 1.1", async () => {
    it("second", async () => {});
    describe("suite 1.1.1", async () => {
      it("third", async () => {});
      describe("suite 1.1.1.1", async () => {
        it("fourth", async () => {});
      });
    });
  });
});
