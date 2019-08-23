import { expect } from "chai";

it("top-level test", () => {
  expect(1).to.be.eq(1);
});

describe("Parent suite", () => {
  it("shallow test", () => {
    expect(1).to.be.eq(1);
  });

  describe("Nested suite", () => {
    describe("Sub suite", () => {
      it("child test", () => {
        expect(1).to.be.eq(1);
      });

      describe("Incredibly nested suite", () => {
        it("the deepest test", () => {
          expect(1).to.be.eq(1);
        });
      });
    });
  });
});
