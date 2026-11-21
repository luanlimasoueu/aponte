import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PROJECT_KINDS, PROJECT_STATUS } from "@/lib/catalog";
import { listOwnProjects, listParticipating, listSharedWithMentor } from "@/lib/projects";
import { Badge, Card, Empty, PageHeader, btnCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus projetos — Ponte" };

export default async function MeusProjetosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const own = await listOwnProjects(user.id);
  const participating = await listParticipating(user.id);
  const shared = user.role === "mentor" ? await listSharedWithMentor(user.id) : [];
  const section = (title: string, items: { id: number; title: string; kind: string; tag: string }[], empty: string) => (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {items.length === 0 ? <Empty>{empty}</Empty> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((p) => (
            <li key={p.id}>
              <Card>
                <Link href={`/projetos/${p.id}`} className="font-semibold text-accent hover:underline">{p.title}</Link>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge kind="projeto" label={PROJECT_KINDS[p.kind as keyof typeof PROJECT_KINDS] ?? p.kind} />
                  <Badge kind="pending" label={p.tag} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Minha conta" title={user.role === "mentor" ? "Projetos mentorados" : user.role === "mentee" ? "Projetos proprios" : "Meus projetos"} />
      <Link href="/projetos/novo" className={`${btnCls} mb-8`}>Criar projeto</Link>
      {user.role === "mentor" && section("Projetos dos meus mentorados", shared.map((p) => ({ id: p.id, title: p.title, kind: p.kind, tag: p.owner_name })), "Nenhum mentorado compartilhou projetos com voce ainda.")}
      {section("Projetos que criei", own.map((p) => ({ id: p.id, title: p.title, kind: p.kind, tag: PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS] ?? p.status })), "Voce ainda nao criou projetos.")}
      {section("Projetos de que participo", participating.map((p) => ({ id: p.id, title: p.title, kind: p.kind, tag: p.application_status === "accepted" ? "Participante" : "Aguardando resposta" })), "Nenhuma participacao ainda.")}
    </div>
  );
}
