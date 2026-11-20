import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { DIFFICULTIES, MODALITIES, PROJECT_KINDS, PROJECT_STATUS, TOOLS } from "@/lib/catalog";
import { listOwnProjects, listParticipating, listPublicProjects, listSharedWithMentor } from "@/lib/projects";
import { val, type SearchParams } from "@/lib/params";
import { Badge, Card, Empty, PageHeader, SelectField, SkillChips, btnCls, btnSecondaryCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projetos — Ponte" };

const KIND_OPTIONS = Object.entries(PROJECT_KINDS).filter(([k]) => k !== "particular");

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  const filters = {
    kind: val(sp, "kind", KIND_OPTIONS.map(([k]) => k)),
    tool: val(sp, "tool", TOOLS),
    difficulty: val(sp, "difficulty", DIFFICULTIES),
    modality: val(sp, "modality", MODALITIES),
    q: val(sp, "q"),
  };
  const projects = listPublicProjects(filters);
  const mine = user ? listOwnProjects(user.id) : [];
  const shared = user?.role === "mentor" ? listSharedWithMentor(user.id) : [];
  const participating = user ? listParticipating(user.id) : [];

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Projetos" title="Aprenda construindo">
        Projetos open source, educacionais e de empresas abertos a participacao. Projetos particulares sao privados:
        aparecem apenas para o dono e para os mentores autorizados.
      </PageHeader>
      {user && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <MiniList title="Meus projetos" empty="Voce ainda nao criou projetos." items={mine.map((p) => ({ id: p.id, title: p.title, tag: p.kind === "particular" ? "Privado" : PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS] }))}>
            <Link href="/projetos/novo" className={`${btnCls} mt-3 w-full`}>Criar projeto</Link>
          </MiniList>
          <MiniList title="Participando" empty="Nenhuma candidatura ainda." items={participating.map((p) => ({ id: p.id, title: p.title, tag: p.application_status === "accepted" ? "Participante" : "Aguardando" }))} />
          {user.role === "mentor" && (
            <MiniList title="Compartilhados comigo" empty="Nenhum mentorado compartilhou projetos particulares." items={shared.map((p) => ({ id: p.id, title: p.title, tag: p.owner_name }))} />
          )}
        </div>
      )}

      <form key={JSON.stringify(filters)} method="GET" action="/projetos" className="mb-6 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_repeat(4,160px)_auto]" aria-label="Filtros">
        <label className="block space-y-1.5"><span className="text-sm font-medium">Buscar</span><input name="q" defaultValue={filters.q} className={inputCls} /></label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Tipo</span>
          <select name="kind" defaultValue={filters.kind} className={inputCls}>
            <option value="">Todos</option>
            {KIND_OPTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <SelectField label="Ferramenta" name="tool" options={TOOLS} value={filters.tool} placeholder="Todas" />
        <SelectField label="Nivel" name="difficulty" options={DIFFICULTIES} value={filters.difficulty} placeholder="Todos" />
        <SelectField label="Modalidade" name="modality" options={MODALITIES} value={filters.modality} placeholder="Todas" />
        <div className="flex items-end gap-2"><button className={btnCls}>Filtrar</button><Link href="/projetos" className={btnSecondaryCls}>Limpar</Link></div>
      </form>

      {projects.length === 0 ? (
        <Empty>Nenhum projeto encontrado com estes filtros.</Empty>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <div className="flex flex-wrap gap-1.5">
                  <Badge kind={p.kind === "open_source" ? "open_source" : p.kind === "empresarial" ? "vaga" : "projeto"} label={PROJECT_KINDS[p.kind]} />
                  <Badge kind={p.status === "aberto" ? "active" : "pending"} label={PROJECT_STATUS[p.status as keyof typeof PROJECT_STATUS] ?? p.status} />
                  {p.difficulty && <Badge kind="projeto" label={p.difficulty} />}
                </div>
                <Link href={`/projetos/${p.id}`} className="mt-3 block text-lg font-semibold text-accent hover:underline">{p.title}</Link>
                <p className="mt-1 text-sm text-muted">{p.summary || p.description.slice(0, 160)}</p>
                <div className="mt-3"><SkillChips skills={p.tools} /></div>
                <p className="mt-3 text-xs text-muted">
                  Por {p.owner_name}{p.modality ? ` · ${p.modality}` : ""}{p.weekly_hours ? ` · ${p.weekly_hours}/semana` : ""}{p.slots ? ` · ${p.slots} vagas` : ""}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MiniList({ title, items, empty, children }: { title: string; items: { id: number; title: string; tag: string }[]; empty: string; children?: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between gap-2">
              <Link href={`/projetos/${i.id}`} className="truncate text-accent hover:underline">{i.title}</Link>
              <span className="shrink-0 text-xs text-muted">{i.tag}</span>
            </li>
          ))}
        </ul>
      )}
      {children}
    </Card>
  );
}
