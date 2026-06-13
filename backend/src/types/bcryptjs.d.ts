declare module "bcryptjs" {
  export function hash(value: string, saltRounds: number): Promise<string>;
  export function compare(value: string, hash: string): Promise<boolean>;
}
