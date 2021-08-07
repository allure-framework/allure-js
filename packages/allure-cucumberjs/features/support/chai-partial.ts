declare global {
  namespace Chai {
    interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
      partial(expected: any, granularity?: string): void;
    }
  }
}

export const ChaiPartial = (_chai: any, utils: any): void => {
  const isType = (type: string, target: any): boolean => {
    return utils.type(target).toUpperCase() === type.toUpperCase();
  };

  const partial = (object: any, expected: any): boolean => {
    if (object === expected) {
      return true;
    }

    if (isType("object", expected) && isType("object", object)) {
      for (const key of Object.keys(expected)) {
        if (!(key in object)) {
          return false;
        }
        if (!partial(object[key], expected[key])) {
          return false;
        }
      }
      return true;
    }

    if (isType("array", expected) && isType("array", object)) {
      if (object.length < expected.length) {
        return false;
      }
      return expected.every((exp: any) => object.some((obj: any) => partial(obj, exp)));
    }

    if (isType("RegExp", object) && isType("RegExp", expected)) {
      return object.toString() === expected.toString();
    }

    if (isType("Date", object) && isType("Date", expected)) {
      return object.getTime() === expected.getTime();
    }

    if (
      (isType("string", object) && isType("string", expected)) ||
      (isType("number", object) && isType("number", expected)) ||
      (isType("boolean", object) && isType("boolean", expected))
    ) {
      return object === expected;
    }

    return false;
  };

  _chai.Assertion.addMethod("partial", function (this: any, expected: any) {
    const object = utils.flag(this, "object");
    this.assert(
      partial(object, expected),
      "expected #{this} to be like #{exp}",
      "expected #{this} to not like #{exp}",
      expected,
      object,
      _chai.config.showDiff,
    );
  });
};
