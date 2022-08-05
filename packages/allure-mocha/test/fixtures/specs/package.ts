import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";

@suite
class Package {
  @test
  shouldPass() {
    expect(1).eq(1)
  }
}
