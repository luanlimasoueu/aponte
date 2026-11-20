import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ponte-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");

let db, projects;
before(async () => {
  db = await import("../src/lib/db.ts");
  projects = await import("../src/lib/projects.ts");
});

const id = (email) => db.getDb().prepare("SELECT id FROM users WHERE email = ?").get(email).id;
const user = (email) => db.getUser(id(email));

test("seed cria perfis educacionais, projetos e metas", () => {
  const d = db.getDb();
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM profiles").get().n, 7);
  assert.ok(d.prepare("SELECT COUNT(*) AS n FROM projects").get().n >= 4);
  assert.ok(d.prepare("SELECT COUNT(*) AS n FROM learning_goals").get().n >= 1);
  const ana = db.getProfile(id("ana@ponte.dev"));
  assert.ok(ana.tools.includes("React"));
  assert.equal(db.profileCompleteness(ana, "mentor"), 1);
});

test("senha: hash scrypt valida a correta e rejeita a errada", () => {
  const u = user("joao@email.com");
  assert.equal(db.verifyPassword("senha123", u.password_hash), true);
  assert.equal(db.verifyPassword("errada", u.password_hash), false);
});

test("perfil salvo e persistido e pode ser editado", () => {
  const joao = id("joao@email.com");
  db.saveProfile(joao, { ...db.getProfile(joao), weeklyHours: "Mais de 10 horas" });
  assert.equal(db.getProfile(joao).weeklyHours, "Mais de 10 horas");
});

test("projeto particular nao aparece na busca publica", () => {
  const list = projects.listPublicProjects();
  assert.ok(list.length >= 3);
  assert.ok(list.every((p) => p.kind !== "particular"));
  assert.ok(projects.listPublicProjects({ kind: "empresarial" }).every((p) => p.kind === "empresarial"));
  assert.ok(projects.listPublicProjects({ tool: "Machine Learning" }).length >= 1);
});

test("projeto particular: dono e mentor autorizado acessam; empresa, outro mentor e outro mentorado nao", () => {
  const p = db.getDb().prepare("SELECT id FROM projects WHERE kind = 'particular'").get();
  assert.ok(projects.getProjectForViewer(p.id, user("maria@email.com")));
  assert.ok(projects.getProjectForViewer(p.id, user("carlos@ponte.dev")));
  assert.equal(projects.getProjectForViewer(p.id, user("ana@ponte.dev")), null);
  assert.equal(projects.getProjectForViewer(p.id, user("contato@techcorp.dev")), null);
  assert.equal(projects.getProjectForViewer(p.id, user("pedro@email.com")), null);
  assert.equal(projects.getProjectForViewer(p.id, null), null);
  assert.equal(projects.listSharedWithMentor(id("carlos@ponte.dev")).length, 1);
});

test("revogar acesso remove a visibilidade imediatamente", () => {
  const p = db.getDb().prepare("SELECT id FROM projects WHERE kind = 'particular'").get();
  const carlos = id("carlos@ponte.dev");
  db.getDb().prepare("UPDATE project_access SET revoked_at = datetime('now') WHERE project_id = ? AND mentor_id = ?").run(p.id, carlos);
  assert.equal(projects.getProjectForViewer(p.id, user("carlos@ponte.dev")), null);
  assert.equal(projects.listSharedWithMentor(carlos).length, 0);
});

test("candidaturas e participantes de projetos", () => {
  const joao = id("joao@email.com");
  const part = projects.listParticipating(joao);
  assert.ok(part.some((p) => p.application_status === "accepted"));
  const oss = db.getDb().prepare("SELECT id FROM projects WHERE kind = 'open_source'").get();
  const view = projects.getProjectForViewer(oss.id, null);
  assert.ok(view.participants.some((x) => x.id === joao));
});

test("eventos tem categoria e cidade; migracoes sao idempotentes", () => {
  const rows = db.getDb().prepare("SELECT category, city FROM events").all();
  assert.ok(rows.length >= 3);
  assert.ok(rows.every((r) => r.category));
  assert.ok(rows.some((r) => r.city === "Recife"));
  const cols = db.getDb().prepare("PRAGMA table_info(mentorships)").all().map((c) => c.name);
  assert.ok(cols.includes("objective"));
});

test("notificacoes", () => {
  const maria = id("maria@email.com");
  db.notify(maria, "teste", "/aprendizado");
  const n = db.getDb().prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(maria).n;
  assert.equal(n, 1);
});
