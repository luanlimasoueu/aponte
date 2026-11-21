import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge, Card, Empty, PageHeader, ROLE_LABELS } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha rede — Ponte" };

type Person = { id: number; name: string; role: string; headline: string; email: string; status: string; objective: string };

export default async function MinhaRedePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const tab = sp.aba === "mentorados" ? "mentorados" : "mentores";
  const db = getDb();
  const people = (tab === "mentores"
    ? await db.prepare(
        `SELECT u.id, u.name, u.role, u.headline, u.email, m.status, m.objective FROM mentorships m
         JOIN users u ON u.id = m.mentor_id WHERE m.mentee_id = ? ORDER BY m.status, u.name`
      ).all(user.id)
    : await db.prepare(
        `SELECT u.id, u.name, u.role, u.headline, u.email, m.status, m.objective FROM mentorships m
         JOIN users u ON u.id = m.mentee_id WHERE m.mentor_id = ? ORDER BY m.status, u.name`
      ).all(user.id)) as unknown as Person[];
  const tabs = [
    { key: "mentores", label: "Mentores" },
    { key: "mentorados", label: "Mentorados" },
  ];
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Minha conta" title="Minha rede" />
      <div role="tablist" className="mb-6 flex gap-2 border-b border-line">
        {tabs.map((t) => (
          <Link key={t.key} role="tab" aria-selected={tab === t.key} href={`/minha-rede?aba=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.key ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {people.length === 0 ? (
        <Empty>
          {tab === "mentores"
            ? <>Voce ainda nao tem mentores. <Link href="/mentores" className="text-accent underline">Encontrar mentores</Link></>
            : "Voce ainda nao tem mentorados."}
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/pessoas/${p.id}`} className="font-semibold text-accent hover:underline">{p.name}</Link>
                    <p className="text-xs text-muted">{ROLE_LABELS[p.role]} · {p.email}</p>
                  </div>
                  <Badge kind={p.status} label={p.status === "active" ? "Ativa" : "Pendente"} />
                </div>
                {p.headline && <p className="mt-2 text-sm text-muted">{p.headline}</p>}
                {p.objective && <p className="mt-2 text-xs text-muted">Objetivo: {p.objective}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
