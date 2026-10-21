import { isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";
export interface IpTrust {
  mode: "direct" | "hosted-proxy" | "trusted-next";
  secret?: string;
}
export function clientIp(
  remote: string,
  headers: Record<string, string | string[] | undefined>,
  config: IpTrust,
): string {
  if (config.mode === "direct") return remote;
  {
    const token = headers["x-oathfront-proxy-token"];
    if (
      !config.secret ||
      config.secret.length < 32 ||
      typeof token !== "string" ||
      Buffer.byteLength(token) !== Buffer.byteLength(config.secret) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(config.secret))
    )
      throw new HttpError(403, "FORBIDDEN");
  }
  const ip = headers["x-oathfront-client-ip"];
  if (typeof ip !== "string" || !isIP(ip))
    throw new HttpError(403, "FORBIDDEN");
  return ip;
}
