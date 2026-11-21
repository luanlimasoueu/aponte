"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { getDb, hashPassword } from "./db";
import { createSession } from "./auth";
import { back, str } from "./session";

const TTL_MS = 1000 * 60 * 60; // 1 hour
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function siteUrl(): Promise<string> {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function sendResetEmail(to: string, name: string, link: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[redefinir-senha] RESEND_API_KEY ausente; link para ${to}: ${link}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Ponte <onboarding@resend.dev>",
      to: [to],
      subject: "Redefinir sua senha na Ponte",
      html: `<p>Ola, ${name.replace(/[<>&]/g, "")}!</p>
<p>Recebemos um pedido para redefinir a senha da sua conta na Ponte.</p>
<p><a href="${link}">Clique aqui para criar uma nova senha</a>. O link vale por 1 hora e so pode ser usado uma vez.</p>
<p>Se voce nao pediu, ignore este e-mail.</p>`,
    }),
  });
  if (!res.ok) console.error(`[redefinir-senha] Resend respondeu ${res.status}: ${await res.text()}`);
  return res.ok;
}

export async function requestPasswordReset(formData: FormData) {
  const email = str(formData, "email", 200).toLowerCase();
  if (!EMAIL_RE.test(email)) back("/esqueci-senha", "error", "Informe um email valido.");
  const user = (await getDb().prepare("SELECT id, name FROM users WHERE email = ?").get(email)) as
    | { id: number; name: string }
    | undefined;
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await getDb().prepare("DELETE FROM password_resets WHERE user_id = ? OR expires_at < ?").run(user.id, Date.now());
    await getDb()
      .prepare("INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)")
      .run(user.id, hashToken(token), Date.now() + TTL_MS);
    await sendResetEmail(email, user.name, `${await siteUrl()}/redefinir-senha?token=${token}`);
  }
  // Same answer whether or not the email exists, so accounts can't be discovered.
  back("/esqueci-senha", "msg", "Se este email estiver cadastrado, enviamos um link para redefinir a senha. Confira a caixa de entrada e o spam.");
}

export async function resetPassword(formData: FormData) {
  const token = str(formData, "token", 200);
  const password = str(formData, "password", 200);
  const confirmation = str(formData, "confirmation", 200);
  const ret = `/redefinir-senha?token=${encodeURIComponent(token)}`;
  if (password.length < 10) back(ret, "error", "A senha precisa ter pelo menos 10 caracteres.");
  if (password !== confirmation) back(ret, "error", "A confirmacao de senha nao confere.");
  const row = (await getDb()
    .prepare("SELECT id, user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
    .get(hashToken(token), Date.now())) as { id: number; user_id: number } | undefined;
  if (!row) back("/esqueci-senha", "error", "Este link expirou ou ja foi usado. Peca um novo.");
  await getDb().prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(password), row!.user_id);
  await getDb().prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(row!.id);
  await getDb().prepare("DELETE FROM sessions WHERE user_id = ?").run(row!.user_id);
  await createSession(row!.user_id);
  back("/dashboard", "msg", "Senha redefinida. Voce ja esta conectado(a).");
}
