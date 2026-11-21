import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ponte-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");

let db, projects;
before(async () => {
  if (process.env.DATABASE_URL) {
    const pg = (await import("pg")).default;
    const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    await c.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await c.end();
  }
  db = await import("../src/lib/db.ts");
  projects = await import("../src/lib/projects.ts");
});

const id = async (email) => (await db.getDb().prepare("SELECT id FROM users WHERE email = ?").get(email)).id;
const user = async (email) => db.getUser(await id(email));
const one = async (sql, ...p) => db.getDb().prepare(sql).get(...p);
const many = async (sql, ...p) => db.getDb().prepare(sql).all(...p);

test("seed cria perfis educacionais, projetos e metas", async () => {
  assert.equal((await one("SELECT COUNT(*) AS n FROM profiles")).n, 7);
  assert.ok((await one("SELECT COUNT(*) AS n FROM projects")).n >= 4);
  assert.ok((await one("SELECT COUNT(*) AS n FROM learning_goals")).n >= 1);
  const ana = await db.getProfile(await id("ana@ponte.dev"));
  assert.ok(ana.tools.includes("React"));
  assert.equal(db.profileCompleteness(ana, "mentor"), 1);
});

test("senha: hash scrypt valida a correta e rejeita a errada", async () => {
  const u = await user("joao@email.com");
  assert.equal(db.verifyPassword("senha123", u.password_hash), true);
  assert.equal(db.verifyPassword("errada", u.password_hash), false);
});

test("perfil salvo e persistido e pode ser editado", async () => {
  const joao = await id("joao@email.com");
  await db.saveProfile(joao, { ...(await db.getProfile(joao)), weeklyHours: "Mais de 10 horas" });
  assert.equal((await db.getProfile(joao)).weeklyHours, "Mais de 10 horas");
});

test("projeto particular nao aparece na busca publica", async () => {
  const list = await projects.listPublicProjects();
  assert.ok(list.length >= 3);
  assert.ok(list.every((p) => p.kind !== "particular"));
  assert.ok((await projects.listPublicProjects({ kind: "empresarial" })).every((p) => p.kind === "empresarial"));
  assert.ok((await projects.listPublicProjects({ tool: "Machine Learning" })).length >= 1);
});

test("projeto particular: dono e mentor autorizado acessam; empresa, outro mentor e outro mentorado nao", async () => {
  const p = await one("SELECT id FROM projects WHERE kind = 'particular'");
  assert.ok(await projects.getProjectForViewer(p.id, await user("maria@email.com")));
  assert.ok(await projects.getProjectForViewer(p.id, await user("carlos@ponte.dev")));
  assert.equal(await projects.getProjectForViewer(p.id, await user("ana@ponte.dev")), null);
  assert.equal(await projects.getProjectForViewer(p.id, await user("contato@techcorp.dev")), null);
  assert.equal(await projects.getProjectForViewer(p.id, await user("pedro@email.com")), null);
  assert.equal(await projects.getProjectForViewer(p.id, null), null);
  assert.equal((await projects.listSharedWithMentor(await id("carlos@ponte.dev"))).length, 1);
});

test("revogar acesso remove a visibilidade imediatamente", async () => {
  const p = await one("SELECT id FROM projects WHERE kind = 'particular'");
  const carlos = await id("carlos@ponte.dev");
  await db.getDb().prepare("UPDATE project_access SET revoked_at = datetime('now') WHERE project_id = ? AND mentor_id = ?").run(p.id, carlos);
  assert.equal(await projects.getProjectForViewer(p.id, await user("carlos@ponte.dev")), null);
  assert.equal((await projects.listSharedWithMentor(carlos)).length, 0);
});

test("candidaturas e participantes de projetos", async () => {
  const joao = await id("joao@email.com");
  const part = await projects.listParticipating(joao);
  assert.ok(part.some((p) => p.application_status === "accepted"));
  const oss = await one("SELECT id FROM projects WHERE kind = 'open_source'");
  const view = await projects.getProjectForViewer(oss.id, null);
  assert.ok(view.participants.some((x) => x.id === joao));
});

test("eventos tem categoria e cidade; colunas novas existem", async () => {
  const rows = await many("SELECT category, city FROM events");
  assert.ok(rows.length >= 3);
  assert.ok(rows.every((r) => r.category));
  assert.ok(rows.some((r) => r.city === "Recife"));
  const m = await one("SELECT objective, message FROM mentorships LIMIT 1");
  assert.ok(m && "objective" in m && "message" in m);
});

test("notificacoes", async () => {
  const maria = await id("maria@email.com");
  await db.notify(maria, "teste", "/aprendizado");
  const n = (await one("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL", maria)).n;
  assert.equal(n, 1);
});

test("busca sem diferenciar maiusculas funciona nos dois bancos", async () => {
  const rows = await many("SELECT name FROM users WHERE LOWER(name) LIKE LOWER(?)", "%ANA%");
  assert.ok(rows.some((r) => r.name === "Ana Souza"));
});

test("GROUP_CONCAT e convertido no PostgreSQL", async () => {
  const r = await one("SELECT GROUP_CONCAT(u.name, ' & ') AS names FROM users u WHERE u.role = 'mentor'");
  assert.ok(r.names.includes("Ana Souza") && r.names.includes(" & "));
});

test("insercao retorna o id gerado", async () => {
  const maria = await id("maria@email.com");
  const r = await db.getDb().prepare("INSERT INTO notifications (user_id, body) VALUES (?,?)").run(maria, "x");
  assert.ok(r.lastInsertRowid > 0);
  assert.equal((await one("SELECT body FROM notifications WHERE id = ?", r.lastInsertRowid)).body, "x");
});

after(async () => {
  if (process.env.DATABASE_URL) process.exit(0);
});
