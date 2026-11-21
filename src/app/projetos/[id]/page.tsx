import { externalHref } from "@/lib/url";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getProjectForViewer } from "@/lib/projects";
import { PROJECT_KINDS, PROJECT_STATUS } from "@/lib/catalog";
import {
  addProjectFeedback, applyToProject, cancelApplication, grantProjectAccess, reviewApplication, revokeProjectAccess, updateProjectStatus,
} from "@/lib/edu-actions";
import { Badge, Card, Empty, Flash, ROLE_LABELS, SkillChips, btnCls, btnSecondaryCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projeto — Ponte" };

export default async function ProjetoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  const view = await getProjectForViewer(Number(id), user);
  // Same response for "does not exist" and "not allowed" so private projects are not revealed.
  if (!view) notFound();
  const { project: p, owner, isOwner, grantedMentors, participants } = view;
  const db = getDb();
  const canComment = !!user && (isOwner || grantedMentors.some((m) => m.id === user.id) || participants.some((x) => x.id === user.id));
  const feedback = canComment
    ? (await db.prepare(
        `SELECT f.*, u.name, u.role FROM project_feedback f JOIN users u ON u.id = f.author_id WHERE f.project_id = ? ORDER BY f.created_at`
      ).all(p.id) as unknown as { id: number; body: string; name: string; role: string; created_at: string }[])
    : [];
  const applications = isOwner
    ? (await db.prepare(
        `SELECT pa.*, u.name, u.role FROM project_applications pa JOIN users u ON u.id = pa.user_id
         WHERE pa.project_id = ? AND pa.status = 'pending' ORDER BY pa.created_at`
      ).all(p.id) as unknown as { id: number; user_id: number; name: string; role: string; message: string }[])
    : [];
  const myApplication = user && !isOwner
    ? (await db.prepare("SELECT status FROM project_applications WHERE project_id = ? AND user_id = ?").get(p.id, user.id) as { status: string } | undefined)
    : undefined;
  const linkedMentors = isOwner && p.kind === "particular"
    ? (await db.prepare(
        `SELECT u.id, u.name FROM mentorships m JOIN users u ON u.id = m.mentor_id
         WHERE m.mentee_id = ? AND m.status = 'active' AND u.role = 'mentor' ORDER BY u.name`
      ).all(user!.id) as unknown as { id: number; name: string }[]).filter((m) => !grantedMentors.some((g) => g.id === m.id))
    : [];
  const full = p.slots !== null && participants.length >= p.slots;

  return (
    <div className="grid gap-8 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Link href="/projetos" className="text-sm text-muted hover:text-fg">← Projetos</Link>
        <Flash params={sp} />
        <div>
          <div className="flex flex-wrap gap-1.5">
            <Badge kind={p.kind === "open_source" ? "open_source" : "projeto"} label={PROJECT_KINDS[p.kind]} />
            <Badge kind={p.status === "aberto" ? "active" : "pending"} label={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS] ?? p.status} />
            {p.kind === "particular" && <Badge kind="requested" label="Privado" />}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{p.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Por <Link href={`/pessoas/${owner.id}`} className="text-accent hover:underline">{owner.name}</Link> ({ROLE_LABELS[owner.role]})
          </p>
        </div>
        {p.summary && <p className="text-lg text-fg/90">{p.summary}</p>}
        <p className="whitespace-pre-line leading-relaxed text-muted">{p.description}</p>
        {p.goals && <div><h2 className="font-semibold">Objetivos de aprendizado</h2><p className="mt-1 text-sm text-muted">{p.goals}</p></div>}
        {p.help_needed && <div><h2 className="font-semibold">Ajuda necessaria</h2><p className="mt-1 text-sm text-muted">{p.help_needed}</p></div>}
        <SkillChips skills={p.tools} />

        {canComment && (
          <section aria-labelledby="feedback">
            <h2 id="feedback" className="text-xl font-semibold">Feedback e comentarios</h2>
            <ul className="mt-3 space-y-3">
              {feedback.length === 0 && <Empty>Nenhum comentario ainda.</Empty>}
              {feedback.map((f) => (
                <li key={f.id} className="rounded-md border border-line p-3">
                  <p className="text-xs text-muted">{f.name} · {ROLE_LABELS[f.role]} · {new Date(f.created_at + "Z").toLocaleDateString("pt-BR")}</p>
                  <p className="mt-1 text-sm">{f.body}</p>
                </li>
              ))}
            </ul>
            <form action={addProjectFeedback} className="mt-3 space-y-2">
              <input type="hidden" name="project_id" value={p.id} />
              <label className="block space-y-1 text-sm"><span>Novo comentario</span><textarea name="body" required rows={3} className={inputCls} /></label>
              <button className={btnSecondaryCls}>Publicar comentario</button>
            </form>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <Card className="space-y-2 text-sm">
          {[
            ["Nivel", p.difficulty], ["Oportunidade", p.opportunity_type], ["Modalidade", p.modality],
            ["Carga semanal", p.weekly_hours], ["Inicio", p.starts_on], ["Termino", p.ends_on], ["Areas", p.areas],
            ["Vagas", p.slots ? `${participants.length}/${p.slots} preenchidas` : ""],
          ].filter(([, v]) => v).map(([k, v]) => (
            <p key={k}><span className="text-muted">{k}:</span> {v}</p>
          ))}
          {p.repo_url && <a href={externalHref(p.repo_url)} target="_blank" rel="noreferrer" className="block text-accent hover:underline">Repositorio ↗</a>}
        </Card>

        {!isOwner && p.kind !== "particular" && (
          <Card>
            {!user ? (
              <Link href="/login" className={`${btnCls} w-full`}>Entre para participar</Link>
            ) : myApplication && myApplication.status !== "cancelled" && myApplication.status !== "rejected" ? (
              <div className="space-y-3">
                <Badge kind={myApplication.status === "accepted" ? "active" : "requested"} label={myApplication.status === "accepted" ? "Voce participa deste projeto" : "Candidatura enviada"} />
                <form action={cancelApplication}><input type="hidden" name="project_id" value={p.id} /><button className={`${btnSecondaryCls} w-full`}>Cancelar participacao</button></form>
              </div>
            ) : myApplication?.status === "rejected" ? (
              <p className="text-sm text-muted">Sua candidatura nao foi aceita desta vez.</p>
            ) : p.status !== "aberto" || full ? (
              <p className="text-sm text-muted">{full ? "Vagas preenchidas." : "Este projeto nao esta recebendo inscricoes."}</p>
            ) : user.role === "company" ? (
              <p className="text-sm text-muted">Empresas podem publicar projetos, mas nao se inscrever.</p>
            ) : (
              <form action={applyToProject} className="space-y-2">
                <input type="hidden" name="project_id" value={p.id} />
                <label className="block space-y-1 text-sm"><span>Por que voce quer participar? (opcional)</span><textarea name="message" rows={3} maxLength={1000} className={inputCls} /></label>
                <button className={`${btnCls} w-full`}>Candidatar-se</button>
              </form>
            )}
          </Card>
        )}

        {isOwner && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Gerenciar</h2>
            <form action={updateProjectStatus} className="flex gap-2">
              <input type="hidden" name="project_id" value={p.id} />
              <label className="sr-only" htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={p.status} className={inputCls}>
                {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className={btnSecondaryCls}>Salvar</button>
            </form>
            {p.kind !== "particular" && (
              <Link href={`/talentos?projeto=${p.id}`} className="block text-sm text-accent hover:underline">Buscar mentorados compativeis →</Link>
            )}
          </Card>
        )}

        {isOwner && p.kind === "particular" && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Mentores com acesso</h2>
            <p className="text-xs text-muted">Somente mentores autorizados veem este projeto. Remover o acesso tem efeito imediato.</p>
            {grantedMentors.length === 0 && <Empty>Nenhum mentor autorizado.</Empty>}
            <ul className="space-y-2">
              {grantedMentors.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  {m.name}
                  <form action={revokeProjectAccess}>
                    <input type="hidden" name="project_id" value={p.id} /><input type="hidden" name="mentor_id" value={m.id} />
                    <button className="text-xs text-red-300 hover:underline">Remover acesso</button>
                  </form>
                </li>
              ))}
            </ul>
            {linkedMentors.length > 0 ? (
              <form action={grantProjectAccess} className="flex gap-2">
                <input type="hidden" name="project_id" value={p.id} />
                <label className="sr-only" htmlFor="mentor">Mentor</label>
                <select id="mentor" name="mentor_id" className={inputCls}>
                  {linkedMentors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button className={btnSecondaryCls}>Autorizar</button>
              </form>
            ) : (
              <p className="text-xs text-muted">Para autorizar outro mentor, primeiro tenha uma mentoria ativa com ele.</p>
            )}
          </Card>
        )}

        {isOwner && p.kind !== "particular" && (
          <Card className="space-y-3">
            <h2 className="font-semibold">Candidaturas ({applications.length})</h2>
            {applications.length === 0 && <Empty>Nenhuma candidatura pendente.</Empty>}
            {applications.map((a) => (
              <div key={a.id} className="rounded-md border border-line p-3 text-sm">
                <Link href={`/pessoas/${a.user_id}`} className="font-medium text-accent hover:underline">{a.name}</Link>
                {a.message && <p className="mt-1 text-xs text-muted">{a.message}</p>}
                <div className="mt-2 flex gap-2">
                  {(["accept", "reject"] as const).map((d) => (
                    <form key={d} action={reviewApplication}>
                      <input type="hidden" name="application_id" value={a.id} /><input type="hidden" name="decision" value={d} />
                      <button className={d === "accept" ? btnCls : btnSecondaryCls}>{d === "accept" ? "Aceitar" : "Recusar"}</button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            <h3 className="pt-2 text-sm font-semibold">Participantes ({participants.length})</h3>
            <ul className="text-sm text-muted">{participants.map((x) => <li key={x.id}>{x.name}</li>)}</ul>
          </Card>
        )}
      </aside>
    </div>
  );
}
