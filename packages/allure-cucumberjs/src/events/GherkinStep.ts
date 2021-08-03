export class GherkinStep {
  location?: {
    line: number;
  };
  keyword?: string;
  text?: string;
  argument?: {
    type: string;
    content?: string;
    rows?: {
      cells: {
        value: string;
      }[];
    }[];
  };

  isBackground?: boolean; // internal
}
