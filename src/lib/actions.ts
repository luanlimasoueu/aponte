"use server";

import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { audit, getDb, hashPassword, verifyPassword, type User } from "./db";
import {
  createAdminSession,
  createSession,
  destroyAdminSession,
  destroySession,
  getSessionUser,
  isAdmin,
} from "./auth";

function back(path: string, key: "msg" | "error", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${key}=${encodeURIComponent(text)}`);
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_MODALITIES = ["online", "in_person", "hybrid"];

async function me(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user!.account_status !== "active") redirect("/login?error=Sua conta ainda nao esta ativa.");
  if (user!.must_change_password) redirect("/primeiro-acesso");
  return user;
}

function isEventOwner(user: User): boolean {
  return user.role === "mentor" || user.role === "company";
}

function validDateTime(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export async function adminLogin(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const expected = process.env.ADMIN_PASSWORD;
  const ok =
    !!expected &&
    email === (process.env.ADMIN_EMAIL ?? "").toLowerCase() &&
    password === expected;
  if (!ok) back("/admin/login", "error", "Credenciais invalidas.");
  await createAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function addInvite(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const email = str(formData, "email").toLowerCase();
  const role = str(formData, "role");
  if (!EMAIL_RE.test(email) || !["mentor", "mentee", "company"].includes(role)) {
    back("/admin", "error", "Informe um email valido e o papel.");
  }
  if (getDb().prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    back("/admin", "error", "Este email ja possui conta.");
  }
  try {
    getDb().prepare("INSERT INTO invites (email, role) VALUES (?,?)").run(email, role);
  } catch {
    back("/admin", "error", "Este email ja foi convidado.");
  }
  back("/admin", "msg", `Convite criado para ${email}.`);
}

export async function removeInvite(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  getDb()
    .prepare("DELETE FROM invites WHERE email = ?")
    .run(str(formData, "email").toLowerCase());
  back("/admin", "msg", "Convite removido.");
}

export async function login(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | User
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    back("/login", "error", "Email ou senha incorretos.");
  }
  if (user!.account_status === "pending") {
    back("/login", "error", "Seu cadastro esta aguardando aprovacao do administrador.");
  }
  if (user!.account_status === "rejected") {
    back("/login", "error", "Seu cadastro nao foi aprovado. Fale com o administrador.");
  }
  await createSession(user!.id);
  if (user!.must_change_password) redirect("/primeiro-acesso");
  redirect("/dashboard");
}

export async function registerAccount(formData: FormData) {
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const confirmation = str(formData, "confirmation");
  const role = str(formData, "role");
  if (name.length < 2 || !EMAIL_RE.test(email) || password.length < 10 || password !== confirmation) {
    back("/signup", "error", "Preencha nome, email e uma senha de ao menos 10 caracteres confirmada corretamente.");
  }
  if (!["mentor", "mentee"].includes(role)) {
    back("/signup", "error", "Escolha se deseja se cadastrar como mentor ou mentorado.");
  }
  if (formData.get("employment_terms") !== "on" || formData.get("code_of_conduct") !== "on") {
    back("/signup", "error", "Aceite as condicoes de participacao e o Codigo de Conduta para enviar seu cadastro.");
  }
  if (formData.get("public_profile_consent") !== "on") {
    back("/signup", "error", "Para participar da rede, confirme que entende quais dados do perfil ficarao publicos.");
  }
  const db = getDb();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    back("/signup", "error", "Este email ja possui cadastro.");
  }
  const result = db.prepare(
    `INSERT INTO users (
      email, password_hash, name, role, account_status, image_consent,
      public_profile_consent, public_profile_consent_at,
      employment_terms_accepted_at, code_of_conduct_accepted_at
    ) VALUES (?,?,?,?, 'pending', ?, 1, datetime('now'), datetime('now'), datetime('now'))`
  ).run(email, hashPassword(password), name, role, formData.get("image_consent") === "on" ? 1 : 0);
  audit(null, "account.requested", "user", Number(result.lastInsertRowid));
  back("/login", "msg", "Cadastro enviado. Aguarde a aprovacao do administrador para entrar.");
}

export async function reviewAccount(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = Number(formData.get("id"));
  const decision = str(formData, "decision");
  if (!Number.isInteger(id) || !["approve", "reject"].includes(decision)) {
    back("/admin", "error", "Cadastro invalido.");
  }
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND account_status = 'pending'").get(id);
  if (!user) back("/admin", "error", "Cadastro nao encontrado ou ja analisado.");
  const status = decision === "approve" ? "active" : "rejected";
  db.prepare("UPDATE users SET account_status = ? WHERE id = ?").run(status, id);
  audit(null, `account.${status}`, "user", id);
  back("/admin", "msg", decision === "approve" ? "Cadastro aprovado e liberado para uso." : "Cadastro recusado.");
}

export async function createMentee(formData: FormData) {
  const mentor = await me();
  if (mentor.role !== "mentor") redirect("/dashboard");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const temporaryPassword = str(formData, "temporary_password");
  if (name.length < 2 || !EMAIL_RE.test(email) || temporaryPassword.length < 10) {
    back("/dashboard", "error", "Informe nome, email valido e uma senha temporaria de ao menos 10 caracteres.");
  }
  const db = getDb();
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    back("/dashboard", "error", "Este email ja possui uma conta.");
  }
  const result = db.prepare(
    "INSERT INTO users (email, password_hash, name, role, account_status, must_change_password) VALUES (?,?,?,?, 'pending', 1)"
  ).run(email, hashPassword(temporaryPassword), name, "mentee");
  const menteeId = Number(result.lastInsertRowid);
  db.prepare("INSERT INTO mentorships (mentor_id, mentee_id, status) VALUES (?,?,'active')").run(mentor.id, menteeId);
  audit(mentor.id, "mentee.created_by_mentor", "user", menteeId);
  back("/dashboard", "msg", "Mentorado criado e conectado a sua rede. O administrador ainda precisa aprovar o cadastro antes do primeiro acesso.");
}

export async function changeInitialPassword(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const password = str(formData, "password");
  const confirmation = str(formData, "confirmation");
  if (password.length < 10 || password !== confirmation) {
    back("/primeiro-acesso", "error", "Use uma senha de ao menos 10 caracteres e confirme o mesmo valor.");
  }
  if (formData.get("employment_terms") !== "on" || formData.get("code_of_conduct") !== "on") {
    back("/primeiro-acesso", "error", "Aceite as condicoes de participacao e o codigo de conduta para continuar.");
  }
  if (formData.get("public_profile_consent") !== "on") {
    back("/primeiro-acesso", "error", "Confirme que entende quais dados do perfil ficarao publicos para continuar.");
  }
  getDb().prepare(
    `UPDATE users SET password_hash = ?, must_change_password = 0,
      image_consent = ?, public_profile_consent = 1, public_profile_consent_at = datetime('now'), employment_terms_accepted_at = datetime('now'),
      code_of_conduct_accepted_at = datetime('now') WHERE id = ?`
  ).run(hashPassword(password), formData.get("image_consent") === "on" ? 1 : 0, user!.id);
  audit(user!.id, "password.initial_changed", "user", user!.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function updateProfile(formData: FormData) {
  const user = await me();
  getDb()
    .prepare(`UPDATE users SET headline = ?, bio = ?, skills = ?,
      public_profile_consent = ?, public_profile_consent_at = CASE WHEN ? = 1 THEN COALESCE(public_profile_consent_at, datetime('now')) ELSE NULL END
      WHERE id = ?`)
    .run(
      str(formData, "headline"), str(formData, "bio"), str(formData, "skills"),
      formData.get("public_profile_consent") === "on" ? 1 : 0,
      formData.get("public_profile_consent") === "on" ? 1 : 0,
      user.id
    );
  back("/dashboard", "msg", "Perfil atualizado.");
}

export async function requestMentorship(formData: FormData) {
  const user = await me();
  const mentorId = Number(formData.get("mentor_id"));
  const ret = str(formData, "return") || "/mentores";
  if (user.role !== "mentee") {
    back(ret, "error", "Apenas mentorados podem solicitar mentoria.");
  }
  if (mentorId === user.id) back(ret, "error", "Voce nao pode ser seu proprio mentor.");
  try {
    getDb()
      .prepare("INSERT INTO mentorships (mentor_id, mentee_id) VALUES (?,?)")
      .run(mentorId, user.id);
  } catch {
    back(ret, "error", "Voce ja possui uma solicitacao com este mentor.");
  }
  back(ret, "msg", "Solicitacao de mentoria enviada.");
}

export async function respondMentorship(formData: FormData) {
  const user = await me();
  if (user.role !== "mentor" && user.role !== "company") redirect("/dashboard");
  const id = Number(formData.get("id"));
  const decision = str(formData, "decision");
  const db = getDb();
  const req = db
    .prepare("SELECT id FROM mentorships WHERE id = ? AND mentor_id = ? AND status = 'pending'")
    .get(id, user.id);
  if (!req) back("/dashboard", "error", "Solicitacao nao encontrada.");
  if (decision === "accept") {
    db.prepare("UPDATE mentorships SET status = 'active' WHERE id = ?").run(id);
  } else {
    db.prepare("DELETE FROM mentorships WHERE id = ?").run(id);
  }
  back("/dashboard", "msg", decision === "accept" ? "Mentoria aceita." : "Solicitacao recusada.");
}

export async function removeMentorship(formData: FormData) {
  const user = await me();
  const id = Number(formData.get("id"));
  getDb()
    .prepare("DELETE FROM mentorships WHERE id = ? AND (mentor_id = ? OR mentee_id = ?)")
    .run(id, user.id, user.id);
  back("/dashboard", "msg", "Conexao removida.");
}

export async function addContribution(formData: FormData) {
  const user = await me();
  if (user.role !== "mentee") redirect("/dashboard");
  const title = str(formData, "title");
  if (!title) back("/dashboard", "error", "Titulo da contribuicao e obrigatorio.");
  getDb()
    .prepare(
      "INSERT INTO contributions (user_id, title, url, type, description) VALUES (?,?,?,?,?)"
    )
    .run(
      user.id,
      title,
      str(formData, "url"),
      str(formData, "type") || "projeto",
      str(formData, "description")
    );
  back("/dashboard", "msg", "Contribuicao publicada no seu perfil.");
}

export async function deleteContribution(formData: FormData) {
  const user = await me();
  getDb()
    .prepare("DELETE FROM contributions WHERE id = ? AND user_id = ?")
    .run(Number(formData.get("id")), user.id);
  back("/dashboard", "msg", "Contribuicao removida.");
}

export async function toggleEndorsement(formData: FormData) {
  const user = await me();
  const contributionId = Number(formData.get("contribution_id"));
  const ret = str(formData, "return") || "/dashboard";
  const db = getDb();
  const contribution = db
    .prepare("SELECT user_id FROM contributions WHERE id = ?")
    .get(contributionId) as { user_id: number } | undefined;
  if (!contribution) back(ret, "error", "Contribuicao nao encontrada.");
  const link = db
    .prepare(
      "SELECT id FROM mentorships WHERE mentor_id = ? AND mentee_id = ? AND status = 'active'"
    )
    .get(user.id, contribution!.user_id);
  if (!link) back(ret, "error", "Voce so pode recomendar contribuicoes da sua rede.");
  const existing = db
    .prepare("SELECT 1 FROM endorsements WHERE contribution_id = ? AND mentor_id = ?")
    .get(contributionId, user.id);
  if (existing) {
    db.prepare("DELETE FROM endorsements WHERE contribution_id = ? AND mentor_id = ?").run(
      contributionId,
      user.id
    );
  } else {
    db.prepare("INSERT INTO endorsements (contribution_id, mentor_id) VALUES (?,?)").run(
      contributionId,
      user.id
    );
  }
  redirect(ret);
}

export async function addOpportunity(formData: FormData) {
  const user = await me();
  if (user.role !== "mentor" && user.role !== "company") redirect("/dashboard");
  const title = str(formData, "title");
  const type = str(formData, "type");
  if (!title || !["open_source", "evento", "vaga"].includes(type)) {
    back("/dashboard", "error", "Preencha titulo e tipo da oportunidade.");
  }
  getDb()
    .prepare(
      "INSERT INTO opportunities (owner_id, type, title, description, skills) VALUES (?,?,?,?,?)"
    )
    .run(user.id, type, title, str(formData, "description"), str(formData, "skills"));
  back("/dashboard", "msg", "Oportunidade publicada.");
}

export async function deleteOpportunity(formData: FormData) {
  const user = await me();
  getDb()
    .prepare("DELETE FROM opportunities WHERE id = ? AND owner_id = ?")
    .run(Number(formData.get("id")), user.id);
  back("/dashboard", "msg", "Oportunidade removida.");
}

export async function createEvent(formData: FormData) {
  const user = await me();
  if (!isEventOwner(user)) back("/dashboard", "error", "Apenas mentores e empresas podem criar eventos.");

  const title = str(formData, "title");
  const modality = str(formData, "modality");
  const startsAt = str(formData, "starts_at");
  const endsAt = str(formData, "ends_at");
  const onlineUrl = str(formData, "online_url");
  const location = str(formData, "location");
  const capacityText = str(formData, "capacity");
  const capacity = capacityText ? Number(capacityText) : null;

  if (!title || !EVENT_MODALITIES.includes(modality) || !validDateTime(startsAt) || !validDateTime(endsAt)) {
    back("/dashboard", "error", "Preencha titulo, modalidade e datas validas.");
  }
  if (Date.parse(endsAt) <= Date.parse(startsAt)) {
    back("/dashboard", "error", "O termino deve acontecer depois do inicio.");
  }
  if ((modality === "online" || modality === "hybrid") && !onlineUrl) {
    back("/dashboard", "error", "Informe o link para o evento online.");
  }
  if ((modality === "in_person" || modality === "hybrid") && !location) {
    back("/dashboard", "error", "Informe o local do evento presencial.");
  }
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) {
    back("/dashboard", "error", "A capacidade deve ser um numero inteiro maior que zero.");
  }

  const result = getDb()
    .prepare(
      `INSERT INTO events (owner_id, title, description, modality, starts_at, ends_at, online_url, location, capacity, require_approval)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      user.id, title, str(formData, "description"), modality, startsAt, endsAt,
      onlineUrl, location, capacity, formData.get("require_approval") === "on" ? 1 : 0
    );
  const eventId = Number(result.lastInsertRowid);
  audit(user.id, "event.created", "event", eventId);
  back("/dashboard", "msg", "Evento publicado e pronto para receber inscricoes.");
}

export async function requestEventAccess(formData: FormData) {
  const user = await me();
  if (user.role !== "mentee") back("/eventos", "error", "A inscricao em eventos e destinada a mentorados.");
  const eventId = Number(formData.get("event_id"));
  const ret = str(formData, "return") || "/eventos";
  const db = getDb();
  const event = db
    .prepare("SELECT * FROM events WHERE id = ? AND status = 'published'")
    .get(eventId) as { id: number; owner_id: number; capacity: number | null; require_approval: number } | undefined;
  if (!event) back(ret, "error", "Evento nao encontrado ou indisponivel.");
  if (event!.owner_id === user.id) back(ret, "error", "Voce nao pode se inscrever no proprio evento.");
  if (formData.get("lgpd") !== "on") {
    back(ret, "error", "Para se inscrever, confirme que leu o aviso de privacidade do evento.");
  }
  const filled = db
    .prepare("SELECT COUNT(*) AS count FROM event_registrations WHERE event_id = ? AND status IN ('requested','approved')")
    .get(eventId) as { count: number };
  const status = event!.capacity !== null && filled.count >= event!.capacity
    ? "waitlist"
    : event!.require_approval
      ? "requested"
      : "approved";
  try {
    const result = db
      .prepare(
        `INSERT INTO event_registrations (event_id, user_id, status, lgpd_accepted_at, communication_consent, image_consent)
         VALUES (?,?,?,datetime('now'),?,?)`
      )
      .run(eventId, user.id, status, formData.get("communications") === "on" ? 1 : 0, formData.get("image") === "on" ? 1 : 0);
    audit(user.id, "event.registration_requested", "event_registration", Number(result.lastInsertRowid));
  } catch {
    back(ret, "error", "Voce ja possui uma inscricao neste evento.");
  }
  const messages: Record<string, string> = {
    approved: "Inscricao confirmada.",
    requested: "Solicitacao enviada para aprovacao do organizador.",
    waitlist: "Evento lotado. Voce entrou na lista de espera.",
  };
  back(ret, "msg", messages[status]);
}

export async function reviewEventRegistration(formData: FormData) {
  const user = await me();
  if (!isEventOwner(user)) redirect("/dashboard");
  const registrationId = Number(formData.get("registration_id"));
  const decision = str(formData, "decision");
  const db = getDb();
  const registration = db
    .prepare(
      `SELECT r.id, r.event_id, e.capacity
       FROM event_registrations r JOIN events e ON e.id = r.event_id
       WHERE r.id = ? AND e.owner_id = ?`
    )
    .get(registrationId, user.id) as { id: number; event_id: number; capacity: number | null } | undefined;
  if (!registration || !["approve", "decline"].includes(decision)) {
    back("/dashboard", "error", "Inscricao nao encontrada.");
  }
  if (decision === "approve" && registration!.capacity !== null) {
    const used = db.prepare("SELECT COUNT(*) AS count FROM event_registrations WHERE event_id = ? AND status = 'approved'")
      .get(registration!.event_id) as { count: number };
    if (used.count >= registration!.capacity) back("/dashboard", "error", "O evento ja atingiu a capacidade.");
  }
  db.prepare("UPDATE event_registrations SET status = ? WHERE id = ?")
    .run(decision === "approve" ? "approved" : "declined", registrationId);
  audit(user.id, `event.registration_${decision}d`, "event_registration", registrationId);
  back("/dashboard", "msg", decision === "approve" ? "Inscricao aprovada." : "Inscricao recusada.");
}

export async function checkInEvent(formData: FormData) {
  const user = await me();
  if (!isEventOwner(user)) redirect("/dashboard");
  const registrationId = Number(formData.get("registration_id"));
  const db = getDb();
  const row = db.prepare(
    `SELECT r.id FROM event_registrations r JOIN events e ON e.id = r.event_id
     WHERE r.id = ? AND r.status = 'approved' AND e.owner_id = ?`
  ).get(registrationId, user.id);
  if (!row) back("/dashboard", "error", "Presenca nao encontrada.");
  db.prepare("UPDATE event_registrations SET checked_in_at = COALESCE(checked_in_at, datetime('now')) WHERE id = ?")
    .run(registrationId);
  audit(user.id, "event.checked_in", "event_registration", registrationId);
  back("/dashboard", "msg", "Presenca registrada.");
}

export async function confirmSafeHome(formData: FormData) {
  const user = await me();
  const registrationId = Number(formData.get("registration_id"));
  const ret = str(formData, "return") || "/dashboard";
  const db = getDb();
  const row = db.prepare(
    `SELECT r.id FROM event_registrations r JOIN events e ON e.id = r.event_id
     WHERE r.id = ? AND r.user_id = ? AND e.modality IN ('in_person','hybrid')`
  ).get(registrationId, user.id);
  if (!row) back(ret, "error", "Confirmacao indisponivel para este evento.");
  db.prepare("UPDATE event_registrations SET safe_home_at = COALESCE(safe_home_at, datetime('now')) WHERE id = ?")
    .run(registrationId);
  audit(user.id, "event.safe_home_confirmed", "event_registration", registrationId);
  back(ret, "msg", "Confirmacao registrada. Que bom que voce chegou bem.");
}

export async function updateAvailability(formData: FormData) {
  const user = await me();
  if (user.role !== "mentee") redirect("/dashboard");
  const weekday = Number(formData.get("weekday"));
  const start = str(formData, "start_time");
  const end = str(formData, "end_time");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start >= end) {
    back("/dashboard", "error", "Informe um dia e um intervalo de horario valido.");
  }
  try {
    getDb().prepare("INSERT INTO availability (user_id, weekday, start_time, end_time) VALUES (?,?,?,?)")
      .run(user.id, weekday, start, end);
  } catch {
    back("/dashboard", "error", "Este horario ja esta na sua disponibilidade.");
  }
  audit(user.id, "availability.created", "availability", null);
  back("/dashboard", "msg", "Disponibilidade adicionada.");
}

export async function removeAvailability(formData: FormData) {
  const user = await me();
  const id = Number(formData.get("id"));
  getDb().prepare("DELETE FROM availability WHERE id = ? AND user_id = ?").run(id, user.id);
  audit(user.id, "availability.deleted", "availability", id);
  back("/dashboard", "msg", "Disponibilidade removida.");
}

export async function scheduleMentorshipMeeting(formData: FormData) {
  const user = await me();
  const mentorshipId = Number(formData.get("mentorship_id"));
  const scheduledAt = str(formData, "scheduled_at");
  const duration = Number(formData.get("duration_minutes") || 60);
  const db = getDb();
  const link = db.prepare(
    "SELECT id FROM mentorships WHERE id = ? AND status = 'active' AND (mentor_id = ? OR mentee_id = ?)"
  ).get(mentorshipId, user.id, user.id);
  if (!link || !validDateTime(scheduledAt) || !Number.isInteger(duration) || duration < 15 || duration > 480) {
    back("/dashboard", "error", "Nao foi possivel agendar este encontro.");
  }
  const result = db.prepare(
    "INSERT INTO mentorship_meetings (mentorship_id, scheduled_at, duration_minutes, notes) VALUES (?,?,?,?)"
  ).run(mentorshipId, scheduledAt, duration, str(formData, "notes"));
  audit(user.id, "mentorship.meeting_scheduled", "mentorship_meeting", Number(result.lastInsertRowid));
  back("/dashboard", "msg", "Encontro de mentoria agendado.");
}

export async function issueCertificate(formData: FormData) {
  const user = await me();
  if (!isEventOwner(user)) redirect("/dashboard");
  const recipientId = Number(formData.get("recipient_id"));
  const eventId = Number(formData.get("event_id"));
  const db = getDb();
  const event = db.prepare("SELECT id, title FROM events WHERE id = ? AND owner_id = ?")
    .get(eventId, user.id) as { id: number; title: string } | undefined;
  const attended = db.prepare(
    "SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? AND checked_in_at IS NOT NULL"
  ).get(eventId, recipientId);
  if (!event || !attended) back("/dashboard", "error", "Certificados so podem ser emitidos para participantes presentes.");
  const code = crypto.randomBytes(9).toString("hex").toUpperCase();
  try {
    const result = db.prepare(
      "INSERT INTO certificates (user_id, event_id, issued_by, title, verification_code) VALUES (?,?,?,?,?)"
    ).run(recipientId, eventId, user.id, event!.title, code);
    audit(user.id, "certificate.issued", "certificate", Number(result.lastInsertRowid));
  } catch {
    back("/dashboard", "error", "Ja existe certificado para esta pessoa neste evento.");
  }
  redirect(`/certificados/${code}`);
}
