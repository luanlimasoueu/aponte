export function baseUrl(): string {
  return (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export function googleRedirectUri(): string {
  return `${baseUrl()}/auth/google/callback`;
}

export interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function fetchGoogleUser(code: string): Promise<GoogleUserInfo | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !code) return null;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return null;
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const infoRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) return null;
  return (await infoRes.json()) as GoogleUserInfo;
}
