import Link from "next/link";
import { getDb, getProfile, profileCompleteness, type Project } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { AREAS, MENTEE_LEVELS, MODALITIES, PERIODS, TOOLS, WEEKDAYS } from "@/lib/catalog";
import { explain, matchMentee, rank, type MenteeQuery } from "@/lib/matching";
import { arr, val, type SearchParams } from "@/lib/params";
import { splitCsv } from "@/lib/session";
import { Card, CheckGroup, Empty, MatchMeter, PageHeader, SelectField, SkillChips, btnCls, btnSecondaryCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";

type TalentRow = { id: number; name: string; headline: string; skills: string; contributions: number; endorsements: number; mentors: number };

export default async function TalentosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const db = getDb();
  const q = val(sp, "q");
  const like = `%${q}%`;

  const ownProjects = user && user.role !== "mentee"
    ? (db.prepare("SELECT * FROM projects WHERE owner_id = ? AND kind != 'particular' ORDER BY updated_at DESC").all(user.id) as unknown as Project[])
    : [];
  const projectId = Number(val(sp, "projeto")) || 0;
  const project = ownProjects.find((p) => p.id === projectId);

  const query: MenteeQuery = project
    ? { tools: splitCsv(project.tools).filter((t) => TOOLS.includes(t)), areas: splitCsv(project.areas).filter((a) => AREAS.includes(a)), levels: [], days: [], periods: [], modality: project.modality === "Ambas" ? "" : project.modality }
    : {
        tools: arr(sp, "tools", TOOLS), toolsRequired: val(sp, "toolsRequired") === "on", areas: arr(sp, "areas", AREAS),
        levels: arr(sp, "levels", MENTEE_LEVELS), days: arr(sp, "days", WEEKDAYS), periods: arr(sp, "periods", PERIODS),
        modality: val(sp, "modality", MODALITIES),
      };

  const mentees = db
    .prepare(
      `SELECT u.*,
         (SELECT COUNT(*) FROM contributions c WHERE c.user_id = u.id) AS contributions,
         (SELECT COUNT(*) FROM endorsements e JOIN contributions c ON c.id = e.contribution_id WHERE c.user_id = u.id) AS endorsements,
         (SELECT COUNT(*) FROM mentorships m WHERE m.mentee_id = u.id AND m.status = 'active') AS mentors
       FROM users u
       WHERE u.role = 'mentee' AND u.account_status = 'active' AND u.public_profile_consent = 1
         AND (u.name LIKE ? OR u.skills LIKE ? OR u.headline LIKE ? OR u.bio LIKE ?)`
    )
    .all(like, like, like, like) as unknown as TalentRow[];

  const results = rank(
    mentees
      .map((t) => {
        const p = getProfile(t.id);
        const match = matchMentee(query, {
          knownTools: p.tools ?? [], learnTools: p.learnTools ?? [], areas: p.areas ?? [], level: p.level ?? "",
          goals: p.goals ?? "", days: p.days ?? [], periods: p.periods ?? [], modality: p.modality ?? "",
        });
        return match ? { ...t, profile: p, match, completeness: profileCompleteness(p, "mentee") + t.endorsements / 100 } : null;
      })
      .filter(<T,>(x: T | null): x is T => x !== null)
  );
  const hasCriteria = results[0]?.match.criteria.some((c) => c.score !== null) ?? false;

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Talentos" title="Encontre mentorados compativeis">
        Pessoas em inicio de carreira ou transicao com contribuicoes reais. A compatibilidade considera ferramentas (30%),
        tipo de projeto (25%), nivel (15%), objetivos de aprendizado (15%), disponibilidade (10%) e modalidade (5%).
        Projetos particulares nunca aparecem aqui.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <form method="GET" action="/talentos" className="space-y-5 self-start rounded-lg border border-line bg-surface p-5" aria-label="Filtros de busca">
          {ownProjects.length > 0 && (
            <div className="space-y-1.5 text-xs">
              <p className="text-sm font-medium">Usar criterios de um projeto meu</p>
              {ownProjects.map((p) => (
                <Link key={p.id} href={`/talentos?projeto=${p.id}`} className={`rounded border px-2 py-1 ${p.id === projectId ? "border-accent text-fg" : "border-line text-muted hover:text-fg"}`}>
                  {p.title}
                </Link>
              ))}
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nome ou palavra-chave</span>
            <input name="q" defaultValue={q} className={inputCls} />
          </label>
          <details open className="space-y-3">
            <summary className="cursor-pointer text-sm font-semibold">Ferramentas</summary>
            <CheckGroup legend="Ferramentas do projeto" name="tools" options={TOOLS} selected={query.tools} />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="toolsRequired" defaultChecked={query.toolsRequired} /> Obrigatorio: conhecer ou querer aprender todas
            </label>
          </details>
          <details className="space-y-3" open={query.areas.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Tipo de projeto</summary>
            <CheckGroup legend="Areas" name="areas" options={AREAS} selected={query.areas} />
          </details>
          <details className="space-y-3" open={query.levels.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Nivel</summary>
            <CheckGroup legend="Niveis aceitos" name="levels" options={MENTEE_LEVELS} selected={query.levels} />
          </details>
          <details className="space-y-3" open={query.days.length + query.periods.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Disponibilidade</summary>
            <CheckGroup legend="Dias" name="days" options={WEEKDAYS} selected={query.days} />
            <CheckGroup legend="Periodos" name="periods" options={PERIODS} selected={query.periods} />
          </details>
          <SelectField label="Modalidade" name="modality" options={MODALITIES} value={query.modality} placeholder="Qualquer" />
          <div className="flex gap-2">
            <button className={`${btnCls} flex-1`}>Buscar</button>
            <Link href="/talentos" className={btnSecondaryCls}>Limpar</Link>
          </div>
        </form>

        <section aria-live="polite" aria-label="Resultados">
          {project && <p className="mb-3 text-sm text-fg">Criterios do projeto <strong>{project.title}</strong>.</p>}
          <p className="mb-4 text-sm text-muted">
            {results.length} {results.length === 1 ? "mentorado encontrado" : "mentorados encontrados"}
            {hasCriteria ? ", ordenados por compatibilidade." : "."}
          </p>
          {results.length === 0 ? (
            <Empty>Nenhum mentorado atende aos criterios obrigatorios.</Empty>
          ) : (
            <ul className="space-y-4">
              {results.map((t) => (
                <li key={t.id}>
                  <Card>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <Link href={`/pessoas/${t.id}`} className="text-lg font-semibold text-accent hover:underline">{t.name}</Link>
                        <p className="text-sm text-muted">{t.headline}</p>
                        <p className="mt-1 text-xs text-muted">
                          {[t.profile.level, t.profile.modality, [t.profile.city, t.profile.state].filter(Boolean).join("/")].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {hasCriteria && <MatchMeter percent={t.match.percent} />}
                    </div>
                    <div className="mt-3"><SkillChips skills={t.skills} /></div>
                    {t.profile.learnTools?.length ? <p className="mt-2 text-xs text-muted">Quer aprender: {t.profile.learnTools.join(", ")}</p> : null}
                    {hasCriteria && <p className="mt-3 text-sm text-fg/90">{explain(t.name.split(" ")[0], t.match)}</p>}
                    {hasCriteria && t.match.gaps.length > 0 && (
                      <ul className="mt-1 list-inside list-disc text-xs text-amber-300/90">{t.match.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
                    )}
                    <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs text-muted">
                      <span>{t.contributions} contribuicoes</span>
                      <span className={t.endorsements > 0 ? "font-medium text-emerald-400" : ""}>{t.endorsements} recomendacoes</span>
                      <span>{t.mentors} mentores</span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
