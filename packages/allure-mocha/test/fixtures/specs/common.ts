import { expect } from "chai";
import { suite, test } from "@testdeck/mocha";

@suite
class Common {
  @test
  shouldPass() {
    expect(1).to.be.eq(1);
  }

  @test
  shouldFail() {
    expect(1).to.be.eq(2);
  }

  @test.skip
  shouldSkip() {}

  @test
  shouldBreak() {
    throw Error("Broken");
  }
}
