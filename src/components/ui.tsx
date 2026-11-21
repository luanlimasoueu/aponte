import type { ReactNode } from "react";

const BADGE_COLORS: Record<string, string> = {
  mentor: "border-accent/30 bg-accent/10 text-accent",
  mentee: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  company: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  open_source: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  evento: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  vaga: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  projeto: "border-line bg-raised text-muted",
  pending: "border-line bg-raised text-muted",
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  online: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  in_person: "border-pink/30 bg-pink/10 text-pink",
  hybrid: "border-violet/30 bg-violet/10 text-violet",
  requested: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  approved: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  waitlist: "border-line bg-raised text-muted",
};

export const ROLE_LABELS: Record<string, string> = {
  mentor: "Mentor(a)",
  mentee: "Mentorado(a)",
  company: "Empresa",
};

export const TYPE_LABELS: Record<string, string> = {
  open_source: "Open source",
  evento: "Evento",
  vaga: "Vaga",
  projeto: "Projeto",
};

export function Badge({ kind, label }: { kind: string; label?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_COLORS[kind] ?? "border-line bg-raised text-muted"}`}
    >
      {label ?? ROLE_LABELS[kind] ?? TYPE_LABELS[kind] ?? kind}
    </span>
  );
}

export function SkillChips({ skills }: { skills: string }) {
  const items = skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <span
          key={s}
          className="rounded border border-line bg-raised px-2 py-0.5 text-xs text-muted"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-surface p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
      {children}
    </p>
  );
}

export function Flash({ params }: { params: { msg?: string; error?: string } }) {
  if (!params.msg && !params.error) return null;
  return (
    <div
      className={`mb-4 rounded-md border px-4 py-3 text-sm ${
        params.error
          ? "border-red-400/30 bg-red-400/10 text-red-300"
          : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
      }`}
    >
      {params.error ?? params.msg}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted/70 italic">{children}</p>;
}

export const inputCls =
  "w-full rounded-md border border-line bg-ink px-3 py-2 text-sm text-fg placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

export const btnCls =
  "inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-strong transition-colors cursor-pointer";

export const btnSecondaryCls =
  "inline-flex items-center justify-center rounded-md border border-line bg-transparent px-4 py-2 text-sm font-medium text-fg hover:border-fg/40 hover:bg-raised transition-colors cursor-pointer";

export function CheckGroup({
  legend, name, options, selected = [], hint, columns = 2,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  selected?: string[];
  hint?: string;
  columns?: 2 | 3 | 4;
}) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[columns];
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-fg">{legend}</legend>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <div className={`grid gap-1.5 ${cols}`}>
        {options.map((o) => (
          <label
            key={o}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-line px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-fg/30 has-[:checked]:border-accent/60 has-[:checked]:bg-accent/10 has-[:checked]:text-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
          >
            <input type="checkbox" name={name} value={o} defaultChecked={selected.includes(o)} className="accent-[#9db4ff]" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function SelectField({
  label, name, options, value = "", placeholder = "Selecione",
}: {
  label: string;
  name: string;
  options: readonly string[];
  value?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      <select name={name} defaultValue={value} className={inputCls}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function MatchMeter({ percent }: { percent: number }) {
  const tone = percent >= 75 ? "bg-emerald-400" : percent >= 50 ? "bg-accent" : "bg-amber-400";
  return (
    <div className="min-w-[120px]">
      <p className="text-right text-2xl font-bold tabular-nums text-fg">
        {percent}%<span className="sr-only"> de compatibilidade</span>
      </p>
      <div className="mt-1 h-1.5 rounded-full bg-raised" aria-hidden="true">
        <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-right text-[11px] uppercase tracking-wider text-muted">compatibilidade</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="py-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
