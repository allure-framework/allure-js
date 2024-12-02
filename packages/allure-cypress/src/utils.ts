export const DEFAULT_RUNTIME_CONFIG = {
  stepsFromCommands: {
    maxArgumentLength: 128,
    maxArgumentDepth: 3,
  },
};

/**
 * Pops items from an array into a new one. The item that matches the predicate is the last item to pop.
 * If there is no such item in the array, the array is left unmodified.
 * @param items An array to pop the items from.
 * @param pred A predicate that defines the last item to pop.
 * @returns An array of popped items. The first popped item becomes the first element of this array.
 */
export const popUntilFindIncluded = <T>(items: T[], pred: (value: T) => boolean) => {
  const index = items.findIndex(pred);
  return index !== -1 ? toReversed(items.splice(index)) : [];
};

export const toReversed = <T = unknown>(arr: T[]): T[] => {
  const len = arr.length;
  const result: T[] = new Array(len);

  for (let i = 0; i < len; i++) {
    result[len - i - 1] = arr[i];
  }

  return result;
};

export const last = <T = unknown>(arr: T[]): T | undefined => {
  return arr[arr.length - 1];
};

export const isDefined = <T>(value: T | undefined): value is T => typeof value !== "undefined";
