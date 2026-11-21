// Deterministic, explainable compatibility scoring. Pure module (no DB access) so it can be unit tested.

export type Criterion = {
  key: string;
  label: string;
  weight: number;
  /** 0..1, or null when the criterion was not requested (its weight is redistributed). */
  score: number | null;
  reason?: string;
  gap?: string;
};

export type MatchResult = {
  percent: number;
  criteria: Criterion[];
  reasons: string[];
  gaps: string[];
};

export const MENTOR_WEIGHTS = {
  tools: 30,
  projectType: 20,
  help: 20,
  availability: 15,
  experience: 10,
  modality: 5,
};

export const COMPANY_WEIGHTS = {
  tools: 30,
  projectType: 25,
  level: 15,
  goals: 15,
  availability: 10,
  modality: 5,
};

export function weightedPercent(criteria: Criterion[]): number {
  const active = criteria.filter((c) => c.score !== null);
  const total = active.reduce((sum, c) => sum + c.weight, 0);
  if (total === 0) return 100;
  const value = active.reduce((sum, c) => sum + c.weight * clamp(c.score as number), 0) / total;
  return Math.round(value * 100);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

export function intersect(wanted: string[], offered: string[]): string[] {
  const set = new Set(offered.map(norm));
  return wanted.filter((w) => set.has(norm(w)));
}

function fraction(wanted: string[], offered: string[]) {
  const hit = intersect(wanted, offered);
  const miss = wanted.filter((w) => !hit.includes(w));
  return { score: wanted.length ? hit.length / wanted.length : null, hit, miss };
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export type Availability = { days: string[]; periods: string[] };

export function availabilityScore(wanted: Availability, offered: Availability): number | null {
  const parts: number[] = [];
  if (wanted.days.length) parts.push(intersect(wanted.days, offered.days).length / wanted.days.length);
  if (wanted.periods.length) {
    const flexible = offered.periods.some((p) => norm(p) === "flexivel") || wanted.periods.some((p) => norm(p) === "flexivel");
    parts.push(flexible ? 1 : intersect(wanted.periods, offered.periods).length / wanted.periods.length);
  }
  if (!parts.length) return null;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

function modalityScore(wanted: string, offered: string): number | null {
  if (!wanted || norm(wanted) === "ambas" || norm(wanted) === "qualquer") return null;
  if (!offered) return 0;
  return norm(offered) === "ambas" || norm(offered) === norm(wanted) ? 1 : 0;
}

// Mentor experience ladder used by the "Experiencia do mentor" filter.
export const MENTOR_EXPERIENCE_FILTER = ["Qualquer", "Junior", "Pleno", "Senior", "Especialista", "Professor ou educador"];

export function mentorExperienceRank(level: string): number {
  const l = norm(level);
  if (l.includes("professor") || l.includes("educador")) return 4;
  if (l.includes("especialista")) return 4;
  if (l.includes("senior")) return 3;
  if (l.includes("pleno")) return 2;
  if (l.includes("junior")) return 1;
  if (l.includes("estudante")) return 0;
  return 0;
}

export type MentorCandidate = {
  tools: string[];
  areas: string[];
  help: string[];
  days: string[];
  periods: string[];
  level: string;
  modality: string;
};

export type MentorQuery = {
  tools: string[];
  toolsRequired?: boolean;
  areas: string[];
  help: string[];
  days: string[];
  periods: string[];
  availabilityRequired?: boolean;
  experience: string;
  modality: string;
};

/** Returns null when a mandatory criterion excludes the candidate. */
export function matchMentor(q: MentorQuery, m: MentorCandidate, weights = MENTOR_WEIGHTS): MatchResult | null {
  const tools = fraction(q.tools, m.tools);
  if (q.toolsRequired && tools.miss.length) return null;
  const avail = availabilityScore({ days: q.days, periods: q.periods }, { days: m.days, periods: m.periods });
  if (q.availabilityRequired && avail !== null && avail === 0) return null;
  if (q.availabilityRequired && q.days.length && intersect(q.days, m.days).length === 0) return null;
  const areas = fraction(q.areas, m.areas);
  const help = fraction(q.help, m.help);

  let experience: number | null = null;
  const wantedRank = MENTOR_EXPERIENCE_FILTER.indexOf(q.experience);
  if (q.experience && wantedRank > 0) {
    const want = mentorExperienceRank(q.experience);
    const has = mentorExperienceRank(m.level);
    experience = has >= want ? 1 : has === want - 1 ? 0.5 : 0;
  }
  const modality = modalityScore(q.modality, m.modality);

  const criteria: Criterion[] = [
    {
      key: "tools", label: "Ferramentas desejadas", weight: weights.tools, score: tools.score,
      reason: tools.hit.length ? `domina ${list(tools.hit)}` : undefined,
      gap: tools.miss.length ? `Voce selecionou ${list(tools.miss)}, mas ${tools.miss.length > 1 ? "essas ferramentas nao constam" : "essa ferramenta nao consta"} no perfil do mentor.` : undefined,
    },
    {
      key: "projectType", label: "Tipo de projeto", weight: weights.projectType, score: areas.score,
      reason: areas.hit.length ? `atua com ${list(areas.hit)}` : undefined,
      gap: areas.miss.length ? `Nao atua com ${list(areas.miss)}.` : undefined,
    },
    {
      key: "help", label: "Tipo de ajuda", weight: weights.help, score: help.score,
      reason: help.hit.length ? `oferece ${list(help.hit.map((h) => h.toLowerCase()))}` : undefined,
      gap: help.miss.length ? `Nao oferece: ${list(help.miss.map((h) => h.toLowerCase()))}.` : undefined,
    },
    {
      key: "availability", label: "Disponibilidade", weight: weights.availability, score: avail,
      reason: avail && avail > 0 ? (avail === 1 ? "possui disponibilidade compativel" : "possui disponibilidade parcialmente compativel") : undefined,
      gap: avail !== null && avail < 1 ? "A disponibilidade nao cobre todos os dias ou periodos escolhidos." : undefined,
    },
    {
      key: "experience", label: "Experiencia do mentor", weight: weights.experience, score: experience,
      reason: experience === 1 ? `tem experiencia ${m.level.toLowerCase()}` : undefined,
      gap: experience !== null && experience < 1 ? `Experiencia informada (${m.level || "nao informada"}) abaixo da pedida.` : undefined,
    },
    {
      key: "modality", label: "Modalidade", weight: weights.modality, score: modality,
      reason: modality === 1 ? `atende na modalidade ${q.modality.toLowerCase()}` : undefined,
      gap: modality === 0 ? `Nao atende na modalidade ${q.modality.toLowerCase()}.` : undefined,
    },
  ];
  return finish(criteria);
}

export type MenteeCandidate = {
  knownTools: string[];
  learnTools: string[];
  areas: string[];
  level: string;
  goals: string;
  days: string[];
  periods: string[];
  modality: string;
};

export type MenteeQuery = {
  tools: string[];
  toolsRequired?: boolean;
  areas: string[];
  levels: string[];
  days: string[];
  periods: string[];
  modality: string;
};

export function matchMentee(q: MenteeQuery, p: MenteeCandidate, weights = COMPANY_WEIGHTS): MatchResult | null {
  const known = intersect(q.tools, p.knownTools);
  const learning = intersect(q.tools, p.learnTools).filter((t) => !known.includes(t));
  const missing = q.tools.filter((t) => !known.includes(t) && !learning.includes(t));
  if (q.toolsRequired && missing.length) return null;
  const toolScore = q.tools.length ? (known.length + learning.length * 0.5) / q.tools.length : null;
  const areas = fraction(q.areas, p.areas);
  const level = q.levels.length ? (intersect(q.levels, [p.level]).length ? 1 : 0) : null;
  const goalText = norm(`${p.goals} ${p.learnTools.join(" ")}`);
  const goalHits = q.tools.concat(q.areas).filter((t) => goalText.includes(norm(t)));
  const goalBase = q.tools.length + q.areas.length;
  const goals = goalBase ? goalHits.length / goalBase : null;
  const avail = availabilityScore({ days: q.days, periods: q.periods }, { days: p.days, periods: p.periods });
  const modality = modalityScore(q.modality, p.modality);

  const criteria: Criterion[] = [
    {
      key: "tools", label: "Ferramentas", weight: weights.tools, score: toolScore,
      reason: known.length || learning.length
        ? [known.length ? `conhece ${list(known)}` : "", learning.length ? `quer aprender ${list(learning)}` : ""].filter(Boolean).join(" e ")
        : undefined,
      gap: missing.length ? `Nao informou ${list(missing)}.` : undefined,
    },
    {
      key: "projectType", label: "Tipo de projeto", weight: weights.projectType, score: areas.score,
      reason: areas.hit.length ? `tem interesse em ${list(areas.hit)}` : undefined,
      gap: areas.miss.length ? `Sem interesse declarado em ${list(areas.miss)}.` : undefined,
    },
    {
      key: "level", label: "Nivel de experiencia", weight: weights.level, score: level,
      reason: level === 1 ? `nivel ${p.level.toLowerCase()}` : undefined,
      gap: level === 0 ? `Nivel informado: ${p.level || "nao informado"}.` : undefined,
    },
    {
      key: "goals", label: "Objetivos de aprendizado", weight: weights.goals, score: goals,
      reason: goalHits.length ? "objetivos de aprendizado alinhados ao projeto" : undefined,
    },
    {
      key: "availability", label: "Disponibilidade", weight: weights.availability, score: avail,
      reason: avail && avail > 0 ? "disponibilidade compativel" : undefined,
      gap: avail !== null && avail < 1 ? "Disponibilidade nao cobre todos os dias ou periodos." : undefined,
    },
    {
      key: "modality", label: "Modalidade", weight: weights.modality, score: modality,
      reason: modality === 1 ? `participa na modalidade ${q.modality.toLowerCase()}` : undefined,
    },
  ];
  return finish(criteria);
}

function finish(criteria: Criterion[]): MatchResult {
  return {
    percent: weightedPercent(criteria),
    criteria,
    reasons: criteria.filter((c) => c.score && c.reason).map((c) => c.reason as string),
    gaps: criteria.filter((c) => c.score !== null && c.gap).map((c) => c.gap as string),
  };
}

export function explain(name: string, r: MatchResult): string {
  if (!r.reasons.length) return `${name} corresponde a ${r.percent}% dos seus criterios.`;
  return `${name} corresponde a ${r.percent}% dos seus criterios porque ${list(r.reasons)}.`;
}

export function rank<T extends { match: MatchResult; completeness: number; name: string }>(rows: T[]): T[] {
  const s = (r: T, key: string) => r.match.criteria.find((c) => c.key === key)?.score ?? 0;
  return [...rows].sort(
    (a, b) =>
      b.match.percent - a.match.percent ||
      s(b, "tools") - s(a, "tools") ||
      s(b, "availability") - s(a, "availability") ||
      b.completeness - a.completeness ||
      a.name.localeCompare(b.name)
  );
}

// ---- Project privacy (pure rules, enforced server-side by every project query) ----

export type ProjectAccessInput = {
  ownerId: number;
  kind: string;
  visibility: string;
  status: string;
};

export type Viewer = { id: number; role: string } | null;

export function isPubliclyListed(p: ProjectAccessInput): boolean {
  return p.kind !== "particular" && p.visibility === "public" && p.status !== "rascunho" && p.status !== "arquivado";
}

export function canViewProject(
  viewer: Viewer,
  p: ProjectAccessInput,
  ctx: { grantedMentorIds: number[]; participantIds: number[] }
): boolean {
  if (viewer && viewer.id === p.ownerId) return true;
  if (p.kind === "particular") {
    return !!viewer && viewer.role === "mentor" && ctx.grantedMentorIds.includes(viewer.id);
  }
  if (isPubliclyListed(p)) return true;
  if (p.status === "rascunho") return false;
  return !!viewer && ctx.participantIds.includes(viewer.id);
}
