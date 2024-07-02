// cjs: const { before, after, beforeEach, afterEach, describe, it } = require("mocha");
// esm: import { before, after, beforeEach, afterEach, describe, it } from "mocha";

// To make the order stable
const wait = async () => await new Promise((r) => setTimeout(r, 1));

describe("level 1", () => {
  before("before at level 1", wait);
  after("after at level 1", wait);
  beforeEach("beforeEach at level 1", wait);
  afterEach("afterEach at level 1", wait);

  describe("level 2", () => {
    before("before at level 2", wait);
    after("after at level 2", wait);
    beforeEach("beforeEach at level 2", wait);
    afterEach("afterEach at level 2", wait);

    it("a test affected by eight fixtures", async () => {});
  });

  it("a test affected by four fixtures", async () => {});
});

it("a test affected by no fixture", async () => {});
