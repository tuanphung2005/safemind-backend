import { createHash } from "node:crypto";

export const hashValue = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

export const toAnonymousId = (deviceId: string): string =>
  `anon_${hashValue(deviceId).slice(0, 24)}`;
