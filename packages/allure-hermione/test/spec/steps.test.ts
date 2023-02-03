import { expect } from "chai";
import Hermione from "hermione";
import { beforeEach, describe, it } from "mocha";
import Sinon from "sinon";
import { HermioneAllure } from "../types";

describe("steps", () => {
  let hermione: HermioneAllure;

  beforeEach(async () => {
    Sinon.restore();

    hermione = new Hermione("./test/.hermione.conf.js") as HermioneAllure;
    await hermione.run(["./test/fixtures/steps.js"], {});
  });

  it("adds nested steps", () => {
    const { steps, labels } = hermione.allure.writer.results[0];
    const customLabel = labels.find(({ name }) => name === "foo");

    expect(customLabel!.value).eq("bar");
    expect(steps.length).eq(1);
    expect(steps[0].name).eq("first step name");
    expect(steps[0].steps.length).eq(1);
    expect(steps[0].steps[0].name).eq("second step name");
    expect(steps[0].steps[0].steps.length).eq(1);
    expect(steps[0].steps[0].steps[0].name).eq("third step name");
  });
});
