import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getDb, type Invite, type User } from "@/lib/db";
import { baseUrl, fetchGoogleUser } from "@/lib/oauth";

function fail(text: string) {
  return NextResponse.redirect(`${baseUrl()}/login?error=${encodeURIComponent(text)}`);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const saved = store.get("g_oauth_state")?.value;
  const rawConsents = store.get("g_signup_consents")?.value;
  store.delete("g_oauth_state");
  store.delete("g_signup_consents");
  if (!code || !state || !saved || state !== saved) {
    return fail("Nao foi possivel validar o login com Google. Tente novamente.");
  }

  const info = await fetchGoogleUser(code);
  const email = (info?.email ?? "").toLowerCase();
  if (!info || !email || info.email_verified !== true) {
    return fail("Nao foi possivel obter seu email do Google.");
  }

  const db = getDb();
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | User
    | undefined;

  if (!user) {
    const invite = db.prepare("SELECT * FROM invites WHERE email = ?").get(email) as
      | Invite
      | undefined;
    if (!invite) {
      return fail("Este email nao foi convidado. Fale com o administrador da Ponte.");
    }
    let consents: { image?: boolean; acceptedAt?: string } = {};
    try {
      consents = rawConsents ? JSON.parse(rawConsents) : {};
    } catch {
      return fail("Nao foi possivel registrar seus aceites. Tente criar a conta novamente.");
    }
    if (!consents.acceptedAt) {
      return fail("Leia e aceite as condicoes de participacao antes de criar a conta.");
    }
    const res = db
      .prepare(
        `INSERT INTO users (
          email, password_hash, name, role, image_consent,
          employment_terms_accepted_at, code_of_conduct_accepted_at
        ) VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        email, "oauth", info.name?.trim() || email.split("@")[0], invite.role,
        consents.image ? 1 : 0, consents.acceptedAt, consents.acceptedAt
      );
    user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(Number(res.lastInsertRowid)) as unknown as User;
  }

  await createSession(user.id);
  return NextResponse.redirect(`${baseUrl()}/dashboard`);
}
