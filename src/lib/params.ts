export type SearchParams = Record<string, string | string[] | undefined>;

export function arr(sp: SearchParams, key: string, allowed?: readonly string[]): string[] {
  const v = sp[key];
  const list = (Array.isArray(v) ? v : v ? [v] : []).map(String);
  return allowed ? list.filter((x) => allowed.includes(x)) : list;
}

export function val(sp: SearchParams, key: string, allowed?: readonly string[]): string {
  const v = sp[key];
  const s = String(Array.isArray(v) ? v[0] : (v ?? "")).trim();
  return allowed && !allowed.includes(s) ? "" : s;
}

export function toQuery(sp: SearchParams, drop: string[] = ["msg", "error"]): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (drop.includes(k) || v === undefined) continue;
    for (const item of Array.isArray(v) ? v : [v]) q.append(k, item);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
