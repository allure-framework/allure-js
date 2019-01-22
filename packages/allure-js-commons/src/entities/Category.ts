import { Status } from "./Status";

export class Category {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  messageRegex?: string | RegExp;
  traceRegex?: string | RegExp;
  matchedStatuses: Status[] = [];
  flaky?: boolean;
}
