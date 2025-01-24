import { getSeconds, supportWebSerial, wait } from "./utils";

declare module "utils" {
  export function wait(ms: number): Promise<void>;
  export function supportWebSerial(): boolean;
  export function getSeconds(seconds: number): number;
}
