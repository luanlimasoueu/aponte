import Link from "next/link";
import { getDb, getProfile, profileCompleteness } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requestMentorship } from "@/lib/actions";
import { AREAS, HELP_TYPES, MODALITIES, PERIODS, TOOLS, WEEKDAYS } from "@/lib/catalog";
import { MENTOR_EXPERIENCE_FILTER, explain, matchMentor, rank, type MatchResult, type MentorQuery } from "@/lib/matching";
import { arr, toQuery, val, type SearchParams } from "@/lib/params";
import {
  Badge, Card, CheckGroup, Empty, Flash, MatchMeter, PageHeader, SelectField, SkillChips, btnCls, btnSecondaryCls, inputCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type MentorRow = { id: number; name: string; role: string; headline: string; bio: string; skills: string; mentees: number };

export default async function MentoresPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const db = getDb();
  const submitted = val(sp, "f") === "1";
  const own = user?.role === "mentee" && !submitted ? await getProfile(user.id) : null;

  const query: MentorQuery = own
    ? {
        tools: own.learnTools ?? [], areas: own.areas ?? [], help: [], days: own.days ?? [], periods: own.periods ?? [],
        experience: "Qualquer", modality: own.modality && own.modality !== "Ambas" ? own.modality : "",
      }
    : {
        tools: arr(sp, "tools", TOOLS),
        toolsRequired: val(sp, "toolsRequired") === "on",
        areas: arr(sp, "areas", AREAS),
        help: arr(sp, "help", HELP_TYPES),
        days: arr(sp, "days", WEEKDAYS),
        periods: arr(sp, "periods", PERIODS),
        availabilityRequired: val(sp, "availabilityRequired") === "on",
        experience: val(sp, "experience", MENTOR_EXPERIENCE_FILTER) || "Qualquer",
        modality: val(sp, "modality", MODALITIES),
      };
  const q = val(sp, "q");
  const like = `%${q}%`;

  const mentors = await db
    .prepare(
      `SELECT u.*,
         (SELECT COUNT(*) FROM mentorships m WHERE m.mentor_id = u.id AND m.status = 'active') AS mentees
       FROM users u
       WHERE u.role IN ('mentor','company') AND u.account_status = 'active'
         AND u.public_profile_consent = 1
         AND (LOWER(u.name) LIKE LOWER(?) OR LOWER(u.skills) LIKE LOWER(?) OR LOWER(u.headline) LIKE LOWER(?) OR LOWER(u.bio) LIKE LOWER(?))`
    )
    .all(like, like, like, like) as unknown as MentorRow[];

  const scored = (await Promise.all(mentors
    .map(async (m) => {
      const p = await getProfile(m.id);
      const match = matchMentor(query, {
        tools: p.tools ?? [], areas: p.areas ?? [], help: p.help ?? [], days: p.days ?? [], periods: p.periods ?? [],
        level: p.level ?? "", modality: p.modality ?? "",
      });
      return match ? { ...m, profile: p, match, completeness: profileCompleteness(p, m.role) } : null;
    })))
    .filter(<T,>(x: T | null): x is T => x !== null);
  const results = rank(scored);
  const hasCriteria = results[0]?.match.criteria.some((c) => c.score !== null) ?? false;

  const myStatus = new Map<number, string>();
  if (user?.role === "mentee") {
    const rows = await db.prepare("SELECT mentor_id, status FROM mentorships WHERE mentee_id = ?").all(user.id) as unknown as { mentor_id: number; status: string }[];
    for (const r of rows) myStatus.set(r.mentor_id, r.status);
  }
  const ret = `/mentores${toQuery(sp)}`;

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Busca por compatibilidade" title="Encontre seu mentor">
        Escolha o que voce quer aprender e quando pode estudar. A compatibilidade e calculada apenas com os criterios
        que voce preencher: ferramentas (30%), tipo de projeto (20%), tipo de ajuda (20%), disponibilidade (15%),
        experiencia (10%) e modalidade (5%).
      </PageHeader>
      <Flash params={{ msg: val(sp, "msg") || undefined, error: val(sp, "error") || undefined }} />
      {own && (
        <p className="mb-4 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-fg">
          Filtros preenchidos com as ferramentas que voce quer aprender e a sua disponibilidade.{" "}
          <Link href="/perfil" className="text-accent underline">Atualizar perfil</Link>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <form key={JSON.stringify(query)} method="GET" action="/mentores" className="space-y-5 self-start rounded-lg border border-line bg-surface p-5" aria-label="Filtros de busca">
          <input type="hidden" name="f" value="1" />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Nome ou palavra-chave</span>
            <input name="q" defaultValue={q} className={inputCls} />
          </label>
          <details open className="space-y-3">
            <summary className="cursor-pointer text-sm font-semibold">Ferramentas</summary>
            <CheckGroup legend="Ferramentas desejadas" name="tools" options={TOOLS} selected={query.tools} />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="toolsRequired" defaultChecked={query.toolsRequired} /> Obrigatorio: o mentor precisa dominar todas
            </label>
          </details>
          <details className="space-y-3" open={query.areas.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Tipo de projeto</summary>
            <CheckGroup legend="Areas" name="areas" options={AREAS} selected={query.areas} />
          </details>
          <details className="space-y-3" open={query.help.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Tipo de ajuda</summary>
            <CheckGroup legend="Ajuda desejada" name="help" options={HELP_TYPES} selected={query.help} />
          </details>
          <details className="space-y-3" open={query.days.length + query.periods.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">Disponibilidade</summary>
            <CheckGroup legend="Dias" name="days" options={WEEKDAYS} selected={query.days} />
            <CheckGroup legend="Periodos" name="periods" options={PERIODS} selected={query.periods} />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="availabilityRequired" defaultChecked={query.availabilityRequired} /> Obrigatorio: precisa ter dia em comum
            </label>
          </details>
          <SelectField label="Experiencia minima do mentor" name="experience" options={MENTOR_EXPERIENCE_FILTER} value={query.experience} placeholder="Qualquer" />
          <SelectField label="Modalidade" name="modality" options={MODALITIES} value={query.modality} placeholder="Qualquer" />
          <div className="flex gap-2">
            <button className={`${btnCls} flex-1`}>Buscar mentores</button>
            <Link href="/mentores?f=1" className={btnSecondaryCls}>Limpar</Link>
          </div>
        </form>

        <section aria-live="polite" aria-label="Resultados">
          <p className="mb-4 text-sm text-muted">
            {results.length} {results.length === 1 ? "mentor encontrado" : "mentores encontrados"}
            {hasCriteria ? ", ordenados por compatibilidade." : ". Selecione criterios para calcular a compatibilidade."}
          </p>
          {results.length === 0 ? (
            <Empty>
              Nenhum mentor atende aos criterios obrigatorios. Tente desmarcar &quot;obrigatorio&quot; ou escolher menos ferramentas.
            </Empty>
          ) : (
            <ul className="space-y-4">
              {results.map((m) => (
                <li key={m.id}>
                  <MentorCard
                    m={m} match={m.match} hasCriteria={hasCriteria} status={myStatus.get(m.id)} ret={ret}
                    viewerRole={user?.role ?? null} location={[m.profile.city, m.profile.state].filter(Boolean).join("/")}
                    details={[m.profile.level, m.profile.modality, m.profile.days?.join(", "), m.profile.periods?.join(", ")].filter(Boolean) as string[]}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function MentorCard({
  m, match, hasCriteria, status, ret, viewerRole, location, details,
}: {
  m: MentorRow; match: MatchResult; hasCriteria: boolean; status?: string; ret: string; viewerRole: string | null; location: string; details: string[];
}) {
  return (
    <Card>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/pessoas/${m.id}`} className="text-lg font-semibold text-accent hover:underline">{m.name}</Link>
            <Badge kind={m.role} />
          </div>
          <p className="text-sm text-muted">{m.headline}</p>
          {(details.length > 0 || location) && (
            <p className="mt-1 text-xs text-muted">{[...details, location].filter(Boolean).join(" · ")}</p>
          )}
        </div>
        {hasCriteria && <MatchMeter percent={match.percent} />}
      </div>
      <div className="mt-3"><SkillChips skills={m.skills} /></div>
      {hasCriteria && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-fg/90">{explain(m.name.split(" ")[0], match)}</p>
          {match.gaps.length > 0 && (
            <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-300/90">
              {match.gaps.map((g) => <li key={g}>{g}</li>)}
            </ul>
          )}
          <details className="text-xs text-muted">
            <summary className="cursor-pointer">Ver calculo</summary>
            <table className="mt-2 w-full max-w-md">
              <thead><tr className="text-left"><th className="font-medium">Criterio</th><th className="font-medium">Peso</th><th className="font-medium">Atendido</th></tr></thead>
              <tbody>
                {match.criteria.map((c) => (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td>{c.weight}%</td>
                    <td>{c.score === null ? "nao selecionado" : `${Math.round(c.score * 100)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-muted">{m.mentees} {m.mentees === 1 ? "pessoa na rede" : "pessoas na rede"}</span>
        {viewerRole === "mentee" &&
          (status === "active" ? (
            <Badge kind="active" label="Na sua rede" />
          ) : status === "pending" ? (
            <Badge kind="pending" label="Solicitacao enviada" />
          ) : (
            <details className="w-full sm:w-auto">
              <summary className={`${btnCls} list-none`}>Solicitar mentoria</summary>
              <form action={requestMentorship} className="mt-3 space-y-2 sm:w-96">
                <input type="hidden" name="mentor_id" value={m.id} />
                <input type="hidden" name="return" value={ret} />
                <label className="block space-y-1 text-xs">
                  <span>Objetivo da mentoria</span>
                  <select name="objective" className={inputCls} defaultValue="">
                    <option value="">Selecione</option>
                    {HELP_TYPES.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-xs">
                  <span>Mensagem para o mentor (opcional)</span>
                  <textarea name="message" rows={3} maxLength={1000} className={inputCls} />
                </label>
                <button className={`${btnCls} w-full`}>Enviar solicitacao</button>
              </form>
            </details>
          ))}
        {!viewerRole && <Link href="/login" className="text-sm text-accent hover:underline">Entre para solicitar</Link>}
      </div>
    </Card>
  );
}
