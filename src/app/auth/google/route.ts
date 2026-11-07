import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { baseUrl, GOOGLE_AUTH_URL, googleRedirectUri } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const isSignup = requestUrl.searchParams.get("signup") === "1";
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl()}/login?error=${encodeURIComponent("Login com Google nao configurado.")}`
    );
  }
  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  if (isSignup) {
    if (
      requestUrl.searchParams.get("employment_terms") !== "on" ||
      requestUrl.searchParams.get("code_of_conduct") !== "on"
    ) {
      return NextResponse.redirect(
        `${baseUrl()}/signup?error=${encodeURIComponent("Leia e aceite as condicoes de participacao e o codigo de conduta.")}`
      );
    }
    store.set("g_signup_consents", JSON.stringify({
      image: requestUrl.searchParams.get("image_consent") === "on",
      acceptedAt: new Date().toISOString(),
    }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    store.delete("g_signup_consents");
  }
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
