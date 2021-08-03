describe("Pending tests", () => {
  xit("simple pending", () => {});

  it("skipped in runtime", function () {
    this.skip();
  });
});
