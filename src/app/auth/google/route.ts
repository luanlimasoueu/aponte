import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { baseUrl, GOOGLE_AUTH_URL, googleRedirectUri } from "@/lib/oauth";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl()}/login?error=${encodeURIComponent("Login com Google nao configurado.")}`
    );
  }
  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("g_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
