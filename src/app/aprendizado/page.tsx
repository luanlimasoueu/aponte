import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addGoalFeedback, addGoalStep, createGoal, setGoalStatus, toggleGoalStep } from "@/lib/edu-actions";
import { listOwnProjects, listParticipating } from "@/lib/projects";
import { Badge, Card, Empty, Field, Flash, PageHeader, btnCls, btnSecondaryCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aprendizado — Ponte" };

type Goal = { id: number; mentee_id: number; mentee_name: string; title: string; description: string; due_on: string; status: string; project_id: number | null; project_title: string | null };
type Step = { id: number; goal_id: number; title: string; done: number };
type Fb = { id: number; goal_id: number; body: string; name: string; created_at: string };

export default async function AprendizadoPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/primeiro-acesso");
  const db = getDb();
  const isMentee = user.role === "mentee";

  const goals = db
    .prepare(
      `SELECT g.*, u.name AS mentee_name, p.title AS project_title FROM learning_goals g
       JOIN users u ON u.id = g.mentee_id LEFT JOIN projects p ON p.id = g.project_id
       WHERE ${isMentee ? "g.mentee_id = ?" : "g.mentee_id IN (SELECT mentee_id FROM mentorships WHERE mentor_id = ? AND status = 'active')"}
       ORDER BY g.status, g.created_at DESC`
    )
    .all(user.id) as unknown as Goal[];
  const ids = goals.map((g) => g.id);
  const marks = ids.map(() => "?").join(",") || "NULL";
  const steps = db.prepare(`SELECT * FROM goal_steps WHERE goal_id IN (${marks}) ORDER BY id`).all(...ids) as unknown as Step[];
  const feedback = db
    .prepare(`SELECT f.*, u.name FROM goal_feedback f JOIN users u ON u.id = f.author_id WHERE f.goal_id IN (${marks}) ORDER BY f.created_at`)
    .all(...ids) as unknown as Fb[];
  const projects = isMentee ? [...listOwnProjects(user.id), ...listParticipating(user.id).filter((p) => p.application_status === "accepted")] : [];

  const totalSteps = steps.length;
  const doneSteps = steps.filter((s) => s.done).length;

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Acompanhamento" title={isMentee ? "Meu aprendizado" : "Aprendizado dos mentorados"}>
        {isMentee
          ? "Defina metas, divida em etapas e acompanhe sua evolucao. Seus mentores ativos veem suas metas e podem deixar feedback."
          : "Metas e etapas dos mentorados com mentoria ativa com voce. Registre feedback para orientar a evolucao."}
      </PageHeader>
      <Flash params={sp} />

      <dl className="mb-8 grid grid-cols-3 gap-4">
        {[
          ["Metas em andamento", goals.filter((g) => g.status === "andamento").length],
          ["Metas concluidas", goals.filter((g) => g.status === "concluida").length],
          ["Etapas concluidas", `${doneSteps}/${totalSteps}`],
        ].map(([k, v]) => (
          <Card key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 text-2xl font-bold tabular-nums">{v}</dd></Card>
        ))}
      </dl>

      <div className={`grid gap-8 ${isMentee ? "lg:grid-cols-[1fr_340px]" : ""}`}>
        <section aria-label="Metas" className="space-y-4">
          {goals.length === 0 && (
            <Empty>{isMentee ? "Crie sua primeira meta ao lado." : "Seus mentorados ainda nao criaram metas."}</Empty>
          )}
          {goals.map((g) => {
            const gs = steps.filter((s) => s.goal_id === g.id);
            const pct = gs.length ? Math.round((gs.filter((s) => s.done).length / gs.length) * 100) : 0;
            return (
              <Card key={g.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{g.title}</h2>
                    <p className="text-xs text-muted">
                      {!isMentee && <>{g.mentee_name} · </>}
                      {g.due_on && <>Prazo {new Date(g.due_on + "T12:00").toLocaleDateString("pt-BR")} · </>}
                      {g.project_id && <Link href={`/projetos/${g.project_id}`} className="text-accent hover:underline">{g.project_title}</Link>}
                    </p>
                  </div>
                  <Badge kind={g.status === "concluida" ? "active" : "pending"} label={g.status === "concluida" ? "Concluida" : "Em andamento"} />
                </div>
                {g.description && <p className="mt-2 text-sm text-muted">{g.description}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da meta">
                    <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-muted">{pct}%</span>
                </div>
                <ul className="mt-3 space-y-1">
                  {gs.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 text-sm">
                      {isMentee ? (
                        <form action={toggleGoalStep}>
                          <input type="hidden" name="step_id" value={s.id} />
                          <button aria-label={`${s.done ? "Reabrir" : "Concluir"} etapa: ${s.title}`} className={`flex h-5 w-5 items-center justify-center rounded border ${s.done ? "border-accent bg-accent text-ink" : "border-line"}`}>
                            {s.done ? "✓" : ""}
                          </button>
                        </form>
                      ) : (
                        <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${s.done ? "border-accent bg-accent text-ink" : "border-line"}`}>{s.done ? "✓" : ""}</span>
                      )}
                      <span className={s.done ? "text-muted line-through" : ""}>{s.title}<span className="sr-only">{s.done ? " (concluida)" : " (pendente)"}</span></span>
                    </li>
                  ))}
                </ul>
                {isMentee && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={addGoalStep} className="flex flex-1 gap-2">
                      <input type="hidden" name="goal_id" value={g.id} />
                      <label className="sr-only" htmlFor={`step-${g.id}`}>Nova etapa</label>
                      <input id={`step-${g.id}`} name="title" placeholder="Nova etapa" className={inputCls} />
                      <button className={btnSecondaryCls}>Adicionar</button>
                    </form>
                    <form action={setGoalStatus}>
                      <input type="hidden" name="goal_id" value={g.id} />
                      <input type="hidden" name="status" value={g.status === "concluida" ? "andamento" : "concluida"} />
                      <button className={btnSecondaryCls}>{g.status === "concluida" ? "Reabrir meta" : "Concluir meta"}</button>
                    </form>
                  </div>
                )}
                <div className="mt-4 border-t border-line pt-3">
                  <h3 className="text-sm font-semibold">Feedback</h3>
                  {feedback.filter((f) => f.goal_id === g.id).map((f) => (
                    <p key={f.id} className="mt-2 text-sm"><span className="text-xs text-muted">{f.name}: </span>{f.body}</p>
                  ))}
                  <form action={addGoalFeedback} className="mt-2 flex gap-2">
                    <input type="hidden" name="goal_id" value={g.id} />
                    <label className="sr-only" htmlFor={`fb-${g.id}`}>{isMentee ? "Comentario" : "Feedback"}</label>
                    <input id={`fb-${g.id}`} name="body" placeholder={isMentee ? "Comente seu progresso" : "Escreva um feedback"} className={inputCls} />
                    <button className={btnSecondaryCls}>Enviar</button>
                  </form>
                </div>
              </Card>
            );
          })}
        </section>

        {isMentee && (
          <Card className="self-start">
            <h2 className="font-semibold">Nova meta</h2>
            <form action={createGoal} className="mt-3 space-y-3">
              <Field label="Meta *"><input name="title" required minLength={3} placeholder="Ex.: Publicar meu primeiro painel" className={inputCls} /></Field>
              <Field label="Descricao"><textarea name="description" rows={2} className={inputCls} /></Field>
              <Field label="Prazo"><input name="due_on" type="date" className={inputCls} /></Field>
              <Field label="Projeto relacionado">
                <select name="project_id" className={inputCls} defaultValue="">
                  <option value="">Nenhum</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>
              <Field label="Etapas (uma por linha)"><textarea name="steps" rows={4} className={inputCls} /></Field>
              <button className={`${btnCls} w-full`}>Criar meta</button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
