import { allure } from "./Setup";
import { delay, delayFail } from "./helpers";

describe("Suite with beforeAll/afterAll success", function() {
  beforeAll(function() {
    allure.step("Step inside beforeAll sync", function() {
      //
    });
  });

  beforeAll(function(done: DoneFn) {
    allure.step("Step inside beforeAll callback", function() {
      return delay(10);
    }).then(function() {
      return delay(10);
    }).then(done);
  });

  beforeAll(async function() {
    await allure.step("Step inside beforeAll async", function() {
      return delay(10);
    });
    await delay(10);
  });


  afterAll(function() {
    allure.step("Step inside afterAll sync", function() {
      //
    });
  });

  afterAll(function(done: DoneFn) {
    allure.step("Step inside afterAll callback", function() {
      return delay(10);
    }).then(function() {
      return delay(10);
    }).then(done);
  });

  afterAll(async function() {
    await allure.step("Step inside afterAll async", function() {
      return delay(10);
    });
    await delay(10);
  });

  it("Test passed", function() {
    expect(1).toEqual(1);
  });

  xit("Skipped test", function() {
    // nothing
  });
});

describe("Suite with beforeAll fail", function() {
  describe("Sync", function() {
    beforeAll(function() {
      allure.step("Step inside beforeAll sync", function() {
        throw new Error("Fail");
      });
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });

  describe("Callback", function() {
    beforeAll(function(done: DoneFn) {
      allure.step("Step inside beforeAll callback", function() {
        return delayFail(10); // todo
      }).then(done).catch(done.fail);
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });

  describe("Async", function() {
    beforeAll(async function() {
      await allure.step("Step inside beforeAll async", function() {
        return delayFail(10);
      });
      await delay(10);
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });
});


describe("Suite with afterAll fail", function() {
  describe("Sync", function() {
    afterAll(function() {
      allure.step("Step inside afterAll sync", function() {
        throw new Error("Fail");
      });
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });

  describe("Callback", function() {
    afterAll(function(done: DoneFn) {
      allure.step("Step inside afterAll callback", function() {
        return delayFail(10); // todo
      }).then(done).catch(done.fail);
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });

  describe("Async", function() {
    afterAll(async function() {
      await allure.step("Step inside afterAll async", function() {
        return delayFail(10);
      });
      await delay(10);
    });

    it("Test passed", function() {
      expect(1).toEqual(1);
    });
  });
});


describe("Suite with beforeEach/afterEach success", function() {
  beforeAll(function() {
    allure.step("Step inside beforeAll sync", function() {
      //
    });
  });

  afterAll(function() {
    allure.step("Step inside afterAll sync", function() {
      //
    });
  });

  beforeEach(function() {
    allure.step("Step inside beforeEach sync", function() {
      //
    });
  });

  beforeEach(function(done: DoneFn) {
    allure.step("Step inside beforeEach callback", function() {
      return delay(10);
    }).then(function() {
      return delay(10);
    }).then(done);
  });

  beforeEach(async function() {
    await allure.step("Step inside beforeEach async", function() {
      return delay(10);
    });
    await delay(10);
  });


  afterEach(function() {
    allure.step("Step inside afterEach sync", function() {
      //
    });
  });

  afterEach(function(done: DoneFn) {
    allure.step("Step inside afterEach callback", function() {
      return delay(10);
    }).then(function() {
      return delay(10);
    }).then(done);
  });

  afterEach(async function() {
    await allure.step("Step inside afterEach async", function() {
      return delay(10);
    });
    await delay(10);
  });

  it("Test passed 1", function() {
    allure.step("Step inside test", function() {
      //
    });
    expect(1).toEqual(1);
  });

  it("Test passed 2", function() {
    expect(1).toEqual(1);
  });
});
