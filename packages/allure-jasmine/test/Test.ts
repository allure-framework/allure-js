describe("Suite name 1", function() {
  it("Test passed", function() {
    expect(1).toEqual(1);
  });

  it("Test failed", function() {
    expect(1).toEqual(2);
  });

  it("Test throws", function() {
    throw new Error("!");
  });

  xit("Skipped test", function() {
    // nothing
  });
});

describe("Suite name 2", function() {
  it("Test passed", function() {
    expect(1).toEqual(1);
  });

  it("Test failed", function() {
    expect(1).toEqual(2);
  });

  it("Test throws", function() {
    throw new Error("!");
  });

  xit("Skipped test", function() {
    // nothing
  });

  it("Test pending with reason", function() {
    expect(1).toBe(2);
    pending("Marked as pending");
  });
});

xdescribe("Suite skipped", function() {
  it("Test passed", function() {
    expect(1).toEqual(1);
  });

  it("Test failed", function() {
    expect(1).toEqual(2);
  });

  it("Test throws", function() {
    throw new Error("!");
  });

  xit("Skipped test", function() {
    // nothing
  });
});


describe("Suite level 1", function() {
  describe("Suite level 2 1", function() {
    describe("Suite level 3 1", function() {
      it("Test passed", function() {
        expect(1).toEqual(1);
      });

      it("Test failed", function() {
        expect(1).toEqual(2);
      });

      it("Test throws", function() {
        throw new Error("!");
      });

      xit("Skipped test", function() {
        // nothing
      });
    });
    describe("Suite level 3 2", function() {
      it("Test passed", function() {
        expect(1).toEqual(1);
      });

      it("Test failed", function() {
        expect(1).toEqual(2);
      });

      it("Test throws", function() {
        throw new Error("!");
      });

      xit("Skipped test", function() {
        // nothing
      });
    });
  });
  describe("Suite level 2 2", function() {
    describe("Suite level 3 1", function() {
      it("Test passed", function() {
        expect(1).toEqual(1);
      });

      it("Test failed", function() {
        expect(1).toEqual(2);
      });

      it("Test throws", function() {
        throw new Error("!");
      });

      xit("Skipped test", function() {
        // nothing
      });
    });
    describe("Suite level 3 2", function() {
      it("Test passed", function() {
        expect(1).toEqual(1);
      });

      it("Test failed", function() {
        expect(1).toEqual(2);
      });

      it("Test throws", function() {
        throw new Error("!");
      });

      xit("Skipped test", function() {
        // nothing
      });
    });
  });
});
