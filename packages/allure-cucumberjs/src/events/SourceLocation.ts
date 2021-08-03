export class SourceLocation {
  public sourceLocation?: { uri: string; line: number };
  public actionLocation?: { uri: string; line: number };

  static toKey(s: SourceLocation): string {
    return `${s.sourceLocation!.uri}:${s.sourceLocation!.line}`;
  }
}
