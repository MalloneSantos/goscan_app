import { endpoints } from "./endpoints";
import { api } from "./client";

export async function healthcheck(): Promise<"ok" | "auth_expired" | "offline"> {
  const res = await api.get(endpoints.auth.me);
  if (res.ok) return "ok";
  if (res.error.type === "AUTH") return "auth_expired";
  if (res.error.type === "NETWORK" || res.error.type === "SERVER") return "offline";
  return "offline";
}
