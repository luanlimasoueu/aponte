import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchMentor, matchMentee, weightedPercent, rank, explain, canViewProject, isPubliclyListed,
} from "../src/lib/matching.ts";

const ana = {
  tools: ["Python", "SQL", "Power BI"], areas: ["Analise de Dados"],
  help: ["Tirar duvidas sobre projetos", "Revisar codigo"],
  days: ["Terca", "Quinta"], periods: ["Noite"], level: "Profissional senior", modality: "Online",
};
const empty = { tools: [], areas: [], help: [], days: [], periods: [], experience: "Qualquer", modality: "" };

test("criterios nao preenchidos nao penalizam (peso redistribuido)", () => {
  const r = matchMentor({ ...empty, tools: ["Python"] }, ana);
  assert.equal(r.percent, 100);
  assert.equal(r.criteria.filter((c) => c.score !== null).length, 1);
});

test("sem criterios retorna 100% sem justificativas inventadas", () => {
  const r = matchMentor(empty, ana);
  assert.equal(r.percent, 100);
  assert.deepEqual(r.reasons, []);
});

test("compatibilidade parcial usa os pesos do PDF", () => {
  // tools 2/3 (30) + help 1/1 (20) => (20 + 20) / 50 = 80%
  const r = matchMentor({ ...empty, tools: ["Python", "SQL", "Java"], help: ["Revisar codigo"] }, ana);
  assert.equal(r.percent, 80);
  assert.ok(r.gaps.some((g) => g.includes("Java")));
  assert.match(explain("Ana", r), /Ana corresponde a 80%.*domina Python e SQL/);
});

test("ferramenta obrigatoria exclui quem nao domina", () => {
  assert.equal(matchMentor({ ...empty, tools: ["Java"], toolsRequired: true }, ana), null);
  assert.ok(matchMentor({ ...empty, tools: ["python"], toolsRequired: true }, ana));
});

test("disponibilidade obrigatoria exclui sem dia em comum", () => {
  assert.equal(matchMentor({ ...empty, days: ["Sabado"], availabilityRequired: true }, ana), null);
  const ok = matchMentor({ ...empty, days: ["Terca"], periods: ["Noite"], availabilityRequired: true }, ana);
  assert.equal(ok.percent, 100);
});

test("periodo flexivel combina com qualquer periodo", () => {
  const r = matchMentor({ ...empty, periods: ["Manha"] }, { ...ana, periods: ["Flexivel"] });
  assert.equal(r.percent, 100);
});

test("experiencia e modalidade", () => {
  assert.equal(matchMentor({ ...empty, experience: "Senior" }, ana).percent, 100);
  assert.equal(matchMentor({ ...empty, experience: "Especialista" }, ana).percent, 50);
  assert.equal(matchMentor({ ...empty, modality: "Presencial" }, ana).percent, 0);
  assert.equal(matchMentor({ ...empty, modality: "Presencial" }, { ...ana, modality: "Ambas" }).percent, 100);
});

test("weightedPercent arredonda e ignora nulos", () => {
  assert.equal(weightedPercent([{ key: "a", label: "a", weight: 30, score: 1 }, { key: "b", label: "b", weight: 10, score: null }]), 100);
  assert.equal(weightedPercent([{ key: "a", label: "a", weight: 1, score: 1 }, { key: "b", label: "b", weight: 2, score: 0 }]), 33);
});

test("ordenacao: percentual, ferramentas, disponibilidade, completude, nome", () => {
  const mk = (name, percent, tools, completeness) => ({
    name, completeness,
    match: { percent, reasons: [], gaps: [], criteria: [{ key: "tools", label: "", weight: 1, score: tools }] },
  });
  const order = rank([mk("Bia", 80, 0.5, 1), mk("Caio", 90, 0.1, 0), mk("Ana", 80, 0.5, 1), mk("Davi", 80, 0.9, 0)]);
  assert.deepEqual(order.map((r) => r.name), ["Caio", "Davi", "Ana", "Bia"]);
});

test("empresa: ferramenta conhecida vale mais que ferramenta a aprender", () => {
  const joao = { knownTools: ["Python"], learnTools: ["SQL"], areas: ["Analise de Dados"], level: "Iniciante, comecando a estudar", goals: "quero aprender SQL", days: [], periods: [], modality: "Online" };
  const q = { tools: ["Python", "SQL"], areas: [], levels: [], days: [], periods: [], modality: "" };
  const r = matchMentee(q, joao);
  // tools (1 + 0.5)/2 = .75 * 30 ; goals 1/2 * 15 => (22.5 + 7.5) / 45 = 67%
  assert.equal(r.percent, 67);
  assert.equal(matchMentee({ ...q, tools: ["Java"], toolsRequired: true }, joao), null);
});

const priv = { ownerId: 1, kind: "particular", visibility: "private", status: "andamento" };
const oss = { ownerId: 1, kind: "open_source", visibility: "public", status: "aberto" };

test("projeto particular: dono e mentor autorizado veem; empresa e outros nao", () => {
  const ctx = { grantedMentorIds: [2], participantIds: [] };
  assert.equal(canViewProject({ id: 1, role: "mentee" }, priv, ctx), true);
  assert.equal(canViewProject({ id: 2, role: "mentor" }, priv, ctx), true);
  assert.equal(canViewProject({ id: 3, role: "mentor" }, priv, ctx), false);
  assert.equal(canViewProject({ id: 4, role: "company" }, priv, { grantedMentorIds: [4], participantIds: [] }), false);
  assert.equal(canViewProject({ id: 5, role: "mentee" }, priv, ctx), false);
  assert.equal(canViewProject(null, priv, ctx), false);
  assert.equal(isPubliclyListed(priv), false);
});

test("revogar acesso retira a permissao imediatamente", () => {
  assert.equal(canViewProject({ id: 2, role: "mentor" }, priv, { grantedMentorIds: [], participantIds: [] }), false);
});

test("projeto publico aparece para todos; rascunho so para o dono", () => {
  assert.equal(canViewProject(null, oss, { grantedMentorIds: [], participantIds: [] }), true);
  assert.equal(isPubliclyListed(oss), true);
  const draft = { ...oss, status: "rascunho" };
  assert.equal(isPubliclyListed(draft), false);
  assert.equal(canViewProject({ id: 9, role: "mentee" }, draft, { grantedMentorIds: [], participantIds: [9] }), false);
  assert.equal(canViewProject({ id: 1, role: "mentee" }, draft, { grantedMentorIds: [], participantIds: [] }), true);
});
