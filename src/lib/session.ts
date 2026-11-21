import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";
import type { User } from "./db";

export function back(path: string, key: "msg" | "error", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${key}=${encodeURIComponent(text)}`);
}

export function str(formData: FormData, key: string, max = 2000): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Only keeps values from the allowed list, so forged form values are ignored. */
export function pick(formData: FormData, key: string, allowed: readonly string[]): string[] {
  return formData.getAll(key).map(String).filter((v) => allowed.includes(v));
}

export function one(formData: FormData, key: string, allowed: readonly string[]): string {
  const v = str(formData, key);
  return allowed.includes(v) ? v : "";
}

export function safeReturn(value: string, fallback: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.account_status !== "active") redirect("/login?error=Sua conta ainda nao esta ativa.");
  if (user.must_change_password) redirect("/primeiro-acesso");
  return user;
}

export function csv(items: string[]): string {
  return items.join(", ");
}

export function splitCsv(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}
