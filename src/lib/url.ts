/** Address as the user typed it, without the http(s):// prefix. */
export function bareUrl(v: string | undefined | null): string {
  return (v ?? "").replace(/^https?:\/\//i, "");
}

/** Clickable href for an address that may have been stored without a scheme. */
export function externalHref(v: string | undefined | null): string {
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
