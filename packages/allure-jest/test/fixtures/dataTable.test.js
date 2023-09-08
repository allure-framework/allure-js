test.each([
  [1, 2, 3],
  [2, 3, 5],
  [3, 4, 7],
])("%i + %i = %i", (a, b, c) => {
  expect(a + b).toBe(c);
});
