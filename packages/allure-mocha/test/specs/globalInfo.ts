import { suite, test } from "@testdeck/mocha";
import { expect } from "chai";
import { runTests } from "../utils";

@suite
class GlobalInfoSuite {
  @test
  async shouldHaveGlobalInfo() {
    const writerStub = await runTests("globalInfo");
    expect(writerStub.categories).deep.eq([
      {
        name: "Sad tests",
        messageRegex: ".*Sad.*",
        matchedStatuses: ["failed"],
      },
      {
        name: "Infrastructure problems",
        messageRegex: ".*Error.*",
        matchedStatuses: ["broken"],
      },
    ]);

    expect(writerStub.envInfo).deep.eq({
      Browser: "chrome",
      GitHub: "https://github.com/sskorol",
      Author: "Sergey Korol",
    });
  }
}
