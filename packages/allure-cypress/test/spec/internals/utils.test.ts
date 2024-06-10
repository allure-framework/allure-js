import { describe, it, expect } from "vitest"
import { pickUntil } from "../../../src/utils"

describe("pickUntil", () => {
  const fixture = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it("returns slice of a given array with elements until predicate matched", () => {
    const res = pickUntil(fixture, (item) => item === 5)

    expect(res).toEqual([1, 2, 3, 4, 5])
  })

  it("returns slice of a given array, but with additional elements when offset is a positive number", () => {
    const res = pickUntil(fixture, (item) => item === 5, 2)

    expect(res).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it("returns cropped slice of a given array when offset is a negative number", () => {
    const res = pickUntil(fixture, (item) => item === 5, -2)

    expect(res).toEqual([1, 2, 3])
  })
})
