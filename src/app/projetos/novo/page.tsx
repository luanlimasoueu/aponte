import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { createProject } from "@/lib/edu-actions";
import { AREAS, DIFFICULTIES, MODALITIES, OPPORTUNITY_TYPES, PROJECT_KINDS, TOOLS, WEEKLY_HOURS } from "@/lib/catalog";
import { Card, CheckGroup, Field, Flash, PageHeader, SelectField, btnCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novo projeto — Ponte" };

const KINDS_BY_ROLE: Record<string, (keyof typeof PROJECT_KINDS)[]> = {
  mentee: ["particular", "open_source"],
  mentor: ["open_source", "educacional"],
  company: ["empresarial", "educacional"],
};

const KIND_HELP: Record<string, string> = {
  particular: "Privado: so voce e os mentores que autorizar podem ver. Nao aparece em buscas.",
  open_source: "Publico, com repositorio aberto. Qualquer pessoa pode se candidatar.",
  educacional: "Projeto guiado para aprendizado em grupo.",
  empresarial: "Projeto real da empresa para formar talentos.",
};

export default async function NovoProjetoPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const kinds = KINDS_BY_ROLE[user.role];
  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader eyebrow="Projetos" title="Criar projeto" />
      <Flash params={sp} />
      <form action={createProject} className="space-y-6">
        <Card className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Tipo de projeto *</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {kinds.map((k, i) => (
                <label key={k} className="cursor-pointer rounded-md border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                  <input type="radio" name="kind" value={k} defaultChecked={i === 0} className="mr-2 accent-[#9db4ff]" />
                  <span className="font-medium">{PROJECT_KINDS[k]}</span>
                  <span className="mt-1 block text-xs text-muted">{KIND_HELP[k]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Nome do projeto *"><input name="title" required minLength={3} maxLength={140} className={inputCls} /></Field>
          <Field label="Resumo curto"><input name="summary" maxLength={240} className={inputCls} /></Field>
          <Field label="Descricao *"><textarea name="description" required minLength={10} rows={4} className={inputCls} /></Field>
          <Field label="Objetivos de aprendizado"><textarea name="goals" rows={2} className={inputCls} /></Field>
          <Field label="Ajuda que voce precisa (opcional)"><input name="help_needed" className={inputCls} /></Field>
        </Card>
        <Card className="space-y-4">
          <CheckGroup legend="Ferramentas utilizadas *" name="tools" options={TOOLS} columns={4} />
          <CheckGroup legend="Areas" name="areas" options={AREAS} columns={3} />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label="Nivel de dificuldade" name="difficulty" options={DIFFICULTIES} />
            <SelectField label="Tipo de oportunidade" name="opportunity_type" options={OPPORTUNITY_TYPES} />
            <SelectField label="Modalidade" name="modality" options={MODALITIES} />
            <SelectField label="Carga horaria semanal" name="weekly_hours" options={WEEKLY_HOURS} />
            <Field label="Inicio"><input name="starts_on" type="date" className={inputCls} /></Field>
            <Field label="Termino previsto"><input name="ends_on" type="date" className={inputCls} /></Field>
            <Field label="Vagas (opcional)"><input name="slots" type="number" min={1} max={500} className={inputCls} /></Field>
          </div>
          <Field label="Repositorio (obrigatorio para open source)"><input name="repo_url" type="text" inputMode="url" placeholder="github.com/usuario/projeto" className={inputCls} /></Field>
          {user.role !== "mentee" && (
            <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="visibility" value="invite" /> Visivel apenas para participantes aceitos (nao aparece na busca publica)</label>
          )}
          <label className="flex items-center gap-2 text-sm text-muted"><input type="checkbox" name="draft" /> Salvar como rascunho</label>
        </Card>
        <button className={`${btnCls} w-full sm:w-auto`}>Criar projeto</button>
      </form>
    </div>
  );
}
