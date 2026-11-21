"use server";

import { audit, getDb, getProfile, notify, saveProfile, type Profile, type Project } from "./db";
import { back, csv, one, pick, requireUser, safeReturn, str } from "./session";
import {
  AREAS, COMPANY_TYPES, DIFFICULTIES, HELP_TYPES, MENTEE_LEVELS, MENTOR_LEVELS, MODALITIES, OPPORTUNITY_TYPES,
  PERIODS, PROJECT_KINDS, PROJECT_STATUS, SECTORS, SESSION_DURATIONS, TOOLS, UFS, WEEKDAYS, WEEKLY_HOURS,
} from "./catalog";
import { getProjectForViewer } from "./projects";

const URL_RE = /^https?:\/\/[^\s]+$/i;

function optionalUrl(formData: FormData, key: string, label: string, ret: string): string {
  const v = str(formData, key, 300);
  if (v && !URL_RE.test(v)) back(ret, "error", `${label}: informe um endereco completo, comecando com https://`);
  return v;
}

// ---------------- Perfil detalhado ----------------

export async function saveDetailedProfile(formData: FormData) {
  const user = await requireUser();
  const ret = "/perfil";
  const current = await getProfile(user.id);
  const common: Profile = {
    city: str(formData, "city", 80),
    state: one(formData, "state", UFS),
    linkedin: optionalUrl(formData, "linkedin", "LinkedIn", ret),
    github: optionalUrl(formData, "github", "GitHub", ret),
    portfolio: optionalUrl(formData, "portfolio", "Portfolio", ret),
  };
  let data: Profile;
  if (user.role === "company") {
    data = {
      ...current, ...common,
      companyType: one(formData, "companyType", COMPANY_TYPES),
      sector: one(formData, "sector", SECTORS),
      website: optionalUrl(formData, "website", "Site", ret),
      cnpj: str(formData, "cnpj", 20),
      responsible: str(formData, "responsible", 120),
      responsibleRole: str(formData, "responsibleRole", 120),
      phone: str(formData, "phone", 30),
      companySize: str(formData, "companySize", 60),
    };
    if (!data.responsible) back(ret, "error", "Informe o nome da pessoa responsavel pela empresa.");
  } else {
    const tools = pick(formData, "tools", TOOLS);
    const days = pick(formData, "days", WEEKDAYS);
    const periods = pick(formData, "periods", PERIODS);
    data = {
      ...current, ...common,
      tools,
      toolsOther: str(formData, "toolsOther", 200),
      areas: pick(formData, "areas", AREAS),
      days, periods,
      modality: one(formData, "modality", MODALITIES),
      weeklyHours: one(formData, "weeklyHours", WEEKLY_HOURS),
    };
    if (user.role === "mentor") {
      Object.assign(data, {
        help: pick(formData, "help", HELP_TYPES),
        level: one(formData, "level", MENTOR_LEVELS),
        sessionDuration: one(formData, "sessionDuration", SESSION_DURATIONS),
        maxMentees: str(formData, "maxMentees", 3),
      });
      if (!tools.length) back(ret, "error", "Selecione pelo menos uma ferramenta que voce domina.");
      if (!data.help?.length) back(ret, "error", "Selecione pelo menos um tipo de ajuda que voce oferece.");
    } else {
      Object.assign(data, {
        learnTools: pick(formData, "learnTools", TOOLS),
        level: one(formData, "level", MENTEE_LEVELS),
        goals: str(formData, "goals", 1000),
      });
      if (!tools.length && formData.get("noTools") !== "on" && !data.learnTools?.length) {
        back(ret, "error", "Selecione as ferramentas que voce conhece, as que quer aprender, ou marque que ainda nao conhece nenhuma.");
      }
    }
    if (!days.length || !periods.length) back(ret, "error", "Informe pelo menos um dia e um periodo de disponibilidade.");
  }
  await saveProfile(user.id, data);
  const skills = user.role === "company" ? user.skills : csv([...(data.tools ?? []), ...(data.toolsOther ? [data.toolsOther] : [])]);
  await getDb()
    .prepare("UPDATE users SET headline = ?, bio = ?, skills = ? WHERE id = ?")
    .run(str(formData, "headline", 160), str(formData, "bio", 2000), skills, user.id);
  await audit(user.id, "profile.updated", "user", user.id);
  back(ret, "msg", "Perfil salvo. Ele ja e usado no calculo de compatibilidade.");
}

// ---------------- Projetos ----------------

const KINDS_BY_ROLE: Record<string, string[]> = {
  mentee: ["particular", "open_source"],
  mentor: ["open_source", "educacional"],
  company: ["empresarial", "educacional"],
};

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const ret = "/projetos/novo";
  const kind = one(formData, "kind", Object.keys(PROJECT_KINDS));
  if (!KINDS_BY_ROLE[user.role]?.includes(kind)) back(ret, "error", "Este tipo de projeto nao esta disponivel para o seu perfil.");
  const title = str(formData, "title", 140);
  const description = str(formData, "description", 4000);
  if (title.length < 3) back(ret, "error", "Informe um nome para o projeto (minimo 3 caracteres).");
  if (description.length < 10) back(ret, "error", "Descreva o projeto em pelo menos 10 caracteres.");
  const tools = pick(formData, "tools", TOOLS);
  if (!tools.length) back(ret, "error", "Selecione pelo menos uma ferramenta usada no projeto.");
  const slotsText = str(formData, "slots");
  const slots = slotsText ? Number(slotsText) : null;
  if (slots !== null && (!Number.isInteger(slots) || slots < 1 || slots > 500)) back(ret, "error", "Vagas deve ser um numero inteiro maior que zero.");
  const repo = optionalUrl(formData, "repo_url", "Repositorio", ret);
  if (kind === "open_source" && !repo) back(ret, "error", "Projetos open source precisam do link do repositorio.");
  const visibility = kind === "particular" ? "private" : formData.get("visibility") === "invite" ? "invite" : "public";
  const status = formData.get("draft") === "on" ? "rascunho" : kind === "particular" ? "andamento" : "aberto";
  const result = await getDb()
    .prepare(
      `INSERT INTO projects (owner_id, kind, title, summary, description, goals, tools, areas, difficulty, opportunity_type,
         modality, weekly_hours, starts_on, ends_on, slots, repo_url, help_needed, status, visibility)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      user.id, kind, title, str(formData, "summary", 240), description, str(formData, "goals", 1000),
      csv(tools), csv(pick(formData, "areas", AREAS)), one(formData, "difficulty", DIFFICULTIES),
      one(formData, "opportunity_type", OPPORTUNITY_TYPES), one(formData, "modality", MODALITIES),
      one(formData, "weekly_hours", WEEKLY_HOURS), str(formData, "starts_on", 10), str(formData, "ends_on", 10),
      slots, repo, str(formData, "help_needed", 500), status, visibility
    );
  const id = Number(result.lastInsertRowid);
  await audit(user.id, "project.created", "project", id);
  back(`/projetos/${id}`, "msg", kind === "particular" ? "Projeto particular criado. Somente voce e os mentores que autorizar podem ve-lo." : "Projeto criado.");
}

async function ownProject(id: number, userId: number): Promise<Project | null> {
  return (await getDb().prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?").get(id, userId) as Project | undefined) ?? null;
}

export async function updateProjectStatus(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  const ret = `/projetos/${id}`;
  const project = await ownProject(id, user.id);
  if (!project) back("/projetos", "error", "Projeto nao encontrado.");
  const status = one(formData, "status", Object.keys(PROJECT_STATUS));
  if (!status) back(ret, "error", "Status invalido.");
  await getDb().prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  await audit(user.id, "project.status", "project", id);
  back(ret, "msg", `Status atualizado para "${PROJECT_STATUS[status as keyof typeof PROJECT_STATUS]}".`);
}

export async function grantProjectAccess(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  const mentorId = Number(formData.get("mentor_id"));
  const ret = `/projetos/${id}`;
  const project = await ownProject(id, user.id);
  if (!project || project.kind !== "particular") back("/projetos", "error", "Projeto particular nao encontrado.");
  const linked = await getDb()
    .prepare(
      `SELECT u.id, u.name FROM mentorships m JOIN users u ON u.id = m.mentor_id
       WHERE m.mentor_id = ? AND m.mentee_id = ? AND m.status = 'active' AND u.role = 'mentor'`
    )
    .get(mentorId, user.id) as { id: number; name: string } | undefined;
  if (!linked) back(ret, "error", "So e possivel autorizar mentores com mentoria ativa com voce.");
  await getDb()
    .prepare(
      `INSERT INTO project_access (project_id, mentor_id) VALUES (?,?)
       ON CONFLICT(project_id, mentor_id) DO UPDATE SET revoked_at = NULL, granted_at = datetime('now')`
    )
    .run(id, mentorId);
  await audit(user.id, "project.access_granted", "project", id);
  await notify(mentorId, `${user.name} compartilhou o projeto particular "${project!.title}" com voce.`, ret);
  back(ret, "msg", `${linked!.name} agora pode ver e comentar este projeto.`);
}

export async function revokeProjectAccess(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  const mentorId = Number(formData.get("mentor_id"));
  const ret = `/projetos/${id}`;
  if (!await ownProject(id, user.id)) back("/projetos", "error", "Projeto nao encontrado.");
  await getDb()
    .prepare("UPDATE project_access SET revoked_at = datetime('now') WHERE project_id = ? AND mentor_id = ? AND revoked_at IS NULL")
    .run(id, mentorId);
  await audit(user.id, "project.access_revoked", "project", id);
  back(ret, "msg", "Acesso removido. O mentor nao consegue mais ver este projeto.");
}

export async function applyToProject(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  const ret = `/projetos/${id}`;
  const view = await getProjectForViewer(id, user);
  if (!view) back("/projetos", "error", "Projeto nao encontrado.");
  const p = view!.project;
  if (view!.isOwner) back(ret, "error", "Voce e o responsavel por este projeto.");
  if (p.kind === "particular" || p.status !== "aberto") back(ret, "error", "Este projeto nao esta recebendo inscricoes.");
  if (user.role === "company") back(ret, "error", "Empresas podem publicar projetos proprios, mas nao se inscrever.");
  if (p.slots !== null && view!.participants.length >= p.slots) back(ret, "error", "Todas as vagas deste projeto ja foram preenchidas.");
  const message = str(formData, "message", 1000);
  const existing = await getDb().prepare("SELECT status FROM project_applications WHERE project_id = ? AND user_id = ?").get(id, user.id) as { status: string } | undefined;
  if (existing && existing.status !== "cancelled") back(ret, "error", "Voce ja possui uma inscricao neste projeto.");
  await getDb()
    .prepare(
      `INSERT INTO project_applications (project_id, user_id, message, status) VALUES (?,?,?,'pending')
       ON CONFLICT(project_id, user_id) DO UPDATE SET status = 'pending', message = excluded.message, created_at = datetime('now')`
    )
    .run(id, user.id, message);
  await notify(p.owner_id, `${user.name} se candidatou ao projeto "${p.title}".`, ret);
  back(ret, "msg", "Candidatura enviada. Voce sera avisado(a) quando o responsavel responder.");
}

export async function cancelApplication(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  await getDb()
    .prepare("UPDATE project_applications SET status = 'cancelled' WHERE project_id = ? AND user_id = ? AND status IN ('pending','accepted')")
    .run(id, user.id);
  back(`/projetos/${id}`, "msg", "Inscricao cancelada.");
}

export async function reviewApplication(formData: FormData) {
  const user = await requireUser();
  const appId = Number(formData.get("application_id"));
  const decision = str(formData, "decision");
  const row = await getDb()
    .prepare(
      `SELECT pa.id, pa.user_id, p.id AS project_id, p.title, p.slots FROM project_applications pa
       JOIN projects p ON p.id = pa.project_id WHERE pa.id = ? AND p.owner_id = ? AND pa.status = 'pending'`
    )
    .get(appId, user.id) as { id: number; user_id: number; project_id: number; title: string; slots: number | null } | undefined;
  if (!row) back("/projetos", "error", "Candidatura nao encontrada.");
  const ret = `/projetos/${row!.project_id}`;
  if (decision === "accept") {
    const { n } = await getDb().prepare("SELECT COUNT(*) AS n FROM project_applications WHERE project_id = ? AND status = 'accepted'").get(row!.project_id) as { n: number };
    if (row!.slots !== null && n >= row!.slots) back(ret, "error", "Todas as vagas ja foram preenchidas.");
  }
  const status = decision === "accept" ? "accepted" : "rejected";
  await getDb().prepare("UPDATE project_applications SET status = ? WHERE id = ?").run(status, appId);
  await notify(
    row!.user_id,
    status === "accepted" ? `Sua candidatura ao projeto "${row!.title}" foi aceita!` : `Sua candidatura ao projeto "${row!.title}" nao foi aceita desta vez.`,
    ret
  );
  await audit(user.id, `project.application_${status}`, "project", row!.project_id);
  back(ret, "msg", status === "accepted" ? "Participante aceito." : "Candidatura recusada.");
}

export async function addProjectFeedback(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("project_id"));
  const ret = `/projetos/${id}`;
  const view = await getProjectForViewer(id, user);
  if (!view) back("/projetos", "error", "Projeto nao encontrado.");
  const allowed =
    view!.isOwner || view!.grantedMentors.some((m) => m.id === user.id) || view!.participants.some((p) => p.id === user.id);
  if (!allowed) back(ret, "error", "Apenas o responsavel, mentores autorizados e participantes podem comentar.");
  const body = str(formData, "body", 2000);
  if (body.length < 2) back(ret, "error", "Escreva o comentario antes de enviar.");
  await getDb().prepare("INSERT INTO project_feedback (project_id, author_id, body) VALUES (?,?,?)").run(id, user.id, body);
  if (!view!.isOwner) await notify(view!.project.owner_id, `${user.name} comentou no projeto "${view!.project.title}".`, ret);
  back(ret, "msg", "Comentario publicado.");
}

// ---------------- Aprendizado ----------------

async function ownGoal(goalId: number, menteeId: number) {
  return await getDb().prepare("SELECT * FROM learning_goals WHERE id = ? AND mentee_id = ?").get(goalId, menteeId) as
    | { id: number; title: string }
    | undefined;
}

export async function createGoal(formData: FormData) {
  const user = await requireUser();
  const ret = "/aprendizado";
  if (user.role !== "mentee") back(ret, "error", "Metas sao criadas pelos mentorados.");
  const title = str(formData, "title", 160);
  if (title.length < 3) back(ret, "error", "Informe a meta em pelo menos 3 caracteres.");
  const projectId = Number(formData.get("project_id")) || null;
  if (projectId) {
    const ok = await getDb()
      .prepare(
        `SELECT 1 FROM projects WHERE id = ? AND (owner_id = ? OR id IN
           (SELECT project_id FROM project_applications WHERE user_id = ? AND status = 'accepted'))`
      )
      .get(projectId, user.id, user.id);
    if (!ok) back(ret, "error", "Projeto invalido para esta meta.");
  }
  const goalId = (
    await getDb()
      .prepare("INSERT INTO learning_goals (mentee_id, project_id, title, description, due_on) VALUES (?,?,?,?,?)")
      .run(user.id, projectId, title, str(formData, "description", 1000), str(formData, "due_on", 10))
  ).lastInsertRowid;
  const steps = str(formData, "steps", 3000).split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const insert = getDb().prepare("INSERT INTO goal_steps (goal_id, title) VALUES (?,?)");
  for (const s of steps) await insert.run(goalId, s.slice(0, 200));
  const mentors = await getDb()
    .prepare("SELECT mentor_id FROM mentorships WHERE mentee_id = ? AND status = 'active'")
    .all(user.id) as { mentor_id: number }[];
  for (const m of mentors) await notify(m.mentor_id, `${user.name} criou a meta "${title}".`, "/aprendizado");
  back(ret, "msg", "Meta criada.");
}

export async function toggleGoalStep(formData: FormData) {
  const user = await requireUser();
  const stepId = Number(formData.get("step_id"));
  const row = await getDb()
    .prepare("SELECT s.id, s.done FROM goal_steps s JOIN learning_goals g ON g.id = s.goal_id WHERE s.id = ? AND g.mentee_id = ?")
    .get(stepId, user.id) as { id: number; done: number } | undefined;
  if (!row) back("/aprendizado", "error", "Etapa nao encontrada.");
  await getDb().prepare("UPDATE goal_steps SET done = ? WHERE id = ?").run(row!.done ? 0 : 1, stepId);
  back("/aprendizado", "msg", row!.done ? "Etapa reaberta." : "Etapa concluida.");
}

export async function addGoalStep(formData: FormData) {
  const user = await requireUser();
  const goalId = Number(formData.get("goal_id"));
  if (!await ownGoal(goalId, user.id)) back("/aprendizado", "error", "Meta nao encontrada.");
  const title = str(formData, "title", 200);
  if (!title) back("/aprendizado", "error", "Informe a etapa.");
  await getDb().prepare("INSERT INTO goal_steps (goal_id, title) VALUES (?,?)").run(goalId, title);
  back("/aprendizado", "msg", "Etapa adicionada.");
}

export async function setGoalStatus(formData: FormData) {
  const user = await requireUser();
  const goalId = Number(formData.get("goal_id"));
  if (!await ownGoal(goalId, user.id)) back("/aprendizado", "error", "Meta nao encontrada.");
  const status = formData.get("status") === "concluida" ? "concluida" : "andamento";
  await getDb().prepare("UPDATE learning_goals SET status = ? WHERE id = ?").run(status, goalId);
  back("/aprendizado", "msg", status === "concluida" ? "Meta concluida. Parabens!" : "Meta reaberta.");
}

export async function addGoalFeedback(formData: FormData) {
  const user = await requireUser();
  const goalId = Number(formData.get("goal_id"));
  const goal = await getDb()
    .prepare(
      `SELECT g.id, g.title, g.mentee_id FROM learning_goals g
       WHERE g.id = ? AND (g.mentee_id = ? OR g.mentee_id IN
         (SELECT mentee_id FROM mentorships WHERE mentor_id = ? AND status = 'active'))`
    )
    .get(goalId, user.id, user.id) as { id: number; title: string; mentee_id: number } | undefined;
  if (!goal) back("/aprendizado", "error", "Voce so pode comentar metas dos seus mentorados.");
  const body = str(formData, "body", 2000);
  if (body.length < 2) back("/aprendizado", "error", "Escreva o feedback antes de enviar.");
  await getDb().prepare("INSERT INTO goal_feedback (goal_id, author_id, body) VALUES (?,?,?)").run(goalId, user.id, body);
  if (goal!.mentee_id !== user.id) await notify(goal!.mentee_id, `${user.name} deixou um feedback na meta "${goal!.title}".`, "/aprendizado");
  back("/aprendizado", "msg", "Feedback registrado.");
}

// ---------------- Notificacoes ----------------

export async function markNotificationsRead(formData: FormData) {
  const user = await requireUser();
  await getDb().prepare("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL").run(user.id);
  back(safeReturn(str(formData, "return"), "/notificacoes"), "msg", "Notificacoes marcadas como lidas.");
}
