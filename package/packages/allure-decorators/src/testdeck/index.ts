import { getAllure } from "../core";
import { processDescriptor } from "../core/descriptor";

/**
 * This code was partially cloned from testdeck/core package and improved to support missing data tracking features.
 */
const nodeSymbol: (key: string) => string = (key): string => `__testdeck_${key}`;
const testNameSymbol: string = nodeSymbol("name");
const parametersSymbol: string = nodeSymbol("parametersSymbol");
const nameForParametersSymbol: string = nodeSymbol("nameForParameters");

type Params = any | ((arg?: any) => any);
type Execution = undefined | "pending" | "only" | "skip" | "execution";
type TestDecorator = (
  target: unknown,
  property: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;
type ParamsDecorator = (params: Params, name?: string) => TestDecorator;

interface ParameterizedPropertyDescriptor extends PropertyDescriptor {
  (params: Params, name?: string): MethodDecorator;

  skip(params: Params, name?: string): MethodDecorator;

  only(params: Params, name?: string): MethodDecorator;

  pending(params: Params, name?: string): MethodDecorator;

  naming(nameForParameters: (params: Params) => string): MethodDecorator;
}

const makeParamsNameFunction = (): any => {
  return (nameForParameters: (params: Params) => string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      target[propertyKey][nameForParametersSymbol] = nameForParameters;
      return descriptor;
    };
};

const makeParamsFunction = <T>(execution?: Execution): ParamsDecorator => {
  return (params: Params, name?: string) =>
    (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const adjustedParams: any = typeof params === "function" ? params() : params;
      target[propertyKey][testNameSymbol] = propertyKey.toString();
      target[propertyKey][parametersSymbol] = target[propertyKey][parametersSymbol] || [];
      [].concat(adjustedParams || []).forEach((param) => {
        target[propertyKey][parametersSymbol].push({ execution, name, params: param });
      });
      return processDescriptor<T>(
        (args) => JSON.stringify(args),
        (arg) => getAllure().parameter("inputs", arg),
        descriptor,
        (prop) => prop.startsWith("__testdeck_"),
      );
    };
};

const makeParamsObject = (): any => {
  return Object.assign(makeParamsFunction(), {
    only: makeParamsFunction("only"),
    pending: makeParamsFunction("pending"),
    skip: makeParamsFunction("skip"),
    naming: makeParamsNameFunction(),
  });
};

export const data: ParameterizedPropertyDescriptor = makeParamsObject();
