export const getTestId = (path: string[]): string => path.join(" ");

export const last = <T>(array: T[]): T => array[array.length - 1];
