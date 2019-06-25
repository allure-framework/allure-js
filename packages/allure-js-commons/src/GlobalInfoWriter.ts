import { ExecutorInfo, Category } from "./model";

export interface GlobalInfoWriter {
  writeExecutorInfo(info: ExecutorInfo): void;

  writeEnvironmentInfo(info?: { [key: string]: string }): void;

  writeCategories(categories: Category[]): void;
}
