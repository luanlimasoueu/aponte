import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, type User } from "./db";

const COOKIE = "ponte_session";
const TTL_MS = 1000 * 60 * 60 * 24 * 30;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const db = getDb();
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)")
    .run(hashToken(token), userId, Date.now() + TTL_MS);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const row = await getDb()
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ?`
    )
    .get(hashToken(token), Date.now()) as User | undefined;
  return row ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token)
    await getDb().prepare("DELETE FROM sessions WHERE token = ?").run(hashToken(token));
  store.delete(COOKIE);
}

const ADMIN_COOKIE = "ponte_admin";
const ADMIN_TTL_S = 60 * 60 * 8;

function adminSig(exp: string, secret: string): Buffer {
  return crypto.createHmac("sha256", secret).update(exp).digest();
}

export async function createAdminSession() {
  const exp = String(Date.now() + ADMIN_TTL_S * 1000);
  const sig = adminSig(exp, process.env.ADMIN_PASSWORD ?? "").toString("hex");
  const store = await cookies();
  store.set(ADMIN_COOKIE, `${exp}.${sig}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TTL_S,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function isAdmin(): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return false;
  const store = await cookies();
  const raw = store.get(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const dot = raw.lastIndexOf(".");
  const exp = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expected = adminSig(exp, secret);
  const got = Buffer.from(sig, "hex");
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
