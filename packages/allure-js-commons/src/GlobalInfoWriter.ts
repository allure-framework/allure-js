import { ExecutorInfo } from "./entities/ExecutorInfo";
import { Category } from "./entities/Category";

export interface GlobalInfoWriter {
  writeExecutorInfo(info: ExecutorInfo): void;

  writeEnvironmentInfo(info?: { [key: string]: string }): void;

  writeCategories(categories: Category[]): void;
}
