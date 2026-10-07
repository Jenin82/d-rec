import { env } from "cloudflare:workers";

export type RuntimeEnv = Cloudflare.Env & {
  BETTER_AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  JUDGE0_KEY?: string;
};

export function getEnv(): RuntimeEnv {
  return env as RuntimeEnv;
}
