let beforeAllVal: undefined | true;
let beforeEachVal: undefined | true;

beforeAll(() => {
  beforeAllVal = true;
});

beforeEach(() => {
  beforeEachVal = true;
});

afterAll(() => {
  expect(beforeAllVal).toBeTruthy();
});

afterEach(() => {
  expect(beforeEachVal).toBeTruthy();
});

describe("example describe for fixtures", () => {
  it("should pass no errors", () => {
    expect(beforeAllVal).toBeTruthy();
    expect(beforeEachVal).toBeTruthy();
  });
});
