export abstract class Crypto {
  abstract uuid(): string;

  abstract md5(str: string): string;
}
