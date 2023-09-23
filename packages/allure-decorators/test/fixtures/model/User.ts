export class User {
  constructor(
    readonly firstName: string,
    readonly lastName: string,
  ) {}

  toString(): string {
    return `${this.firstName}${this.lastName}`;
  }
}
