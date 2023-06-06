it.skip("should be skipped", () => {});

describe("with skip", () => {
  it.skip("should be skipped", () => {});
});

describe("with specific browser skip", () => {
  hermione.skip.in("headless");
  it("should be skipped", () => {});
});
