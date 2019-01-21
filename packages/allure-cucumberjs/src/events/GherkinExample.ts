export class GherkinExample {
  tableHeader?: {
    cells: {
      value: string;
    }[];
  };
  tableBody?: {
    location: {
      line: number;
    };
    cells: {
      value: string;
    }[];
  }[];
}
