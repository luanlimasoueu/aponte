import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getProfile, profileCompleteness } from "@/lib/db";
import { saveDetailedProfile } from "@/lib/edu-actions";
import {
  AREAS, COMPANY_TYPES, HELP_TYPES, MENTEE_LEVELS, MENTOR_LEVELS, MODALITIES, NO_TOOLS, PERIODS, SECTORS,
  SESSION_DURATIONS, TOOLS, UFS, WEEKDAYS, WEEKLY_HOURS,
} from "@/lib/catalog";
import { Card, CheckGroup, Field, Flash, PageHeader, ROLE_LABELS, SelectField, btnCls, inputCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meu perfil — Ponte" };

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/primeiro-acesso");
  const p = await getProfile(user.id);
  const completeness = Math.round(profileCompleteness(p, user.role) * 100);
  const isCompany = user.role === "company";
  const isMentor = user.role === "mentor";

  return (
    <div className="pb-10">
      <PageHeader eyebrow={`Perfil de ${ROLE_LABELS[user.role]}`} title="Meu perfil">
        Estas informacoes sao usadas no calculo de compatibilidade. Perfil {completeness}% completo.{" "}
        <Link href={`/pessoas/${user.id}`} className="text-accent hover:underline">Ver perfil publico</Link>
      </PageHeader>
      <Flash params={sp} />
      <form action={saveDetailedProfile} className="space-y-6">
        <Card className="space-y-4">
          <h2 className="font-semibold">{isCompany ? "Dados da empresa" : "Apresentacao"}</h2>
          <Field label={isCompany ? "Resumo da empresa" : "Resumo profissional"}>
            <input name="headline" defaultValue={user.headline} maxLength={160} className={inputCls} />
          </Field>
          <Field label={isCompany ? "Descricao da empresa" : "Sobre voce"}>
            <textarea name="bio" rows={3} defaultValue={user.bio} className={inputCls} />
          </Field>
          {isCompany && (
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Tipo de empresa" name="companyType" options={COMPANY_TYPES} value={p.companyType} />
              <SelectField label="Setor de atuacao" name="sector" options={SECTORS} value={p.sector} />
              <Field label="Pessoa responsavel *"><input name="responsible" required defaultValue={p.responsible} className={inputCls} /></Field>
              <Field label="Cargo da pessoa responsavel"><input name="responsibleRole" defaultValue={p.responsibleRole} className={inputCls} /></Field>
              <Field label="Site"><input name="website" type="url" placeholder="https://" defaultValue={p.website} className={inputCls} /></Field>
              <Field label="CNPJ (opcional)"><input name="cnpj" inputMode="numeric" defaultValue={p.cnpj} className={inputCls} /></Field>
              <Field label="Telefone (opcional)"><input name="phone" type="tel" autoComplete="tel" defaultValue={p.phone} className={inputCls} /></Field>
              <Field label="Numero de colaboradores"><input name="companySize" defaultValue={p.companySize} className={inputCls} /></Field>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Cidade"><input name="city" defaultValue={p.city} className={inputCls} /></Field>
            <SelectField label="Estado" name="state" options={UFS} value={p.state} placeholder="UF" />
          </div>
          {!isCompany && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="LinkedIn (opcional)"><input name="linkedin" type="url" placeholder="https://" defaultValue={p.linkedin} className={inputCls} /></Field>
              <Field label="GitHub (opcional)"><input name="github" type="url" placeholder="https://" defaultValue={p.github} className={inputCls} /></Field>
              <Field label="Portfolio (opcional)"><input name="portfolio" type="url" placeholder="https://" defaultValue={p.portfolio} className={inputCls} /></Field>
            </div>
          )}
        </Card>

        {!isCompany && (
          <>
            <Card className="space-y-5">
              <h2 className="font-semibold">Ferramentas e areas</h2>
              <CheckGroup
                legend={isMentor ? "Ferramentas que voce domina *" : "Ferramentas que voce ja conhece"}
                name="tools" options={TOOLS} selected={p.tools} columns={4}
              />
              {!isMentor && (
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="noTools" defaultChecked={!p.tools?.length && !!p.learnTools?.length} /> {NO_TOOLS}
                </label>
              )}
              <Field label="Outras ferramentas"><input name="toolsOther" defaultValue={p.toolsOther} className={inputCls} /></Field>
              {!isMentor && <CheckGroup legend="Ferramentas que voce quer aprender" name="learnTools" options={TOOLS} selected={p.learnTools} columns={4} />}
              <CheckGroup
                legend={isMentor ? "Tipos de projeto com que voce atua" : "Areas de interesse"}
                name="areas" options={AREAS} selected={p.areas} columns={3}
              />
              {isMentor && <CheckGroup legend="Tipos de ajuda que voce oferece *" name="help" options={HELP_TYPES} selected={p.help} />}
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label={isMentor ? "Nivel de experiencia" : "Nivel atual"} name="level" options={isMentor ? MENTOR_LEVELS : MENTEE_LEVELS} value={p.level} />
                {isMentor && (
                  <Field label="Mentorados ao mesmo tempo (opcional)">
                    <input name="maxMentees" type="number" min={1} max={50} defaultValue={p.maxMentees} className={inputCls} />
                  </Field>
                )}
              </div>
              {!isMentor && (
                <Field label="Objetivos de aprendizado" hint="Ex.: conseguir a primeira vaga em dados, montar um portfolio, aprender React.">
                  <textarea name="goals" rows={3} defaultValue={p.goals} className={inputCls} />
                </Field>
              )}
            </Card>

            <Card className="space-y-5">
              <h2 className="font-semibold">Disponibilidade</h2>
              <CheckGroup legend="Dias disponiveis *" name="days" options={WEEKDAYS} selected={p.days} columns={4} />
              <CheckGroup legend="Periodos *" name="periods" options={PERIODS} selected={p.periods} columns={4} />
              <div className="grid gap-4 sm:grid-cols-3">
                {isMentor && <SelectField label="Duracao de cada mentoria" name="sessionDuration" options={SESSION_DURATIONS} value={p.sessionDuration} />}
                <SelectField label="Horas por semana" name="weeklyHours" options={WEEKLY_HOURS} value={p.weeklyHours} />
                <SelectField label="Modalidade" name="modality" options={MODALITIES} value={p.modality} />
              </div>
            </Card>
          </>
        )}
        <p className="text-xs text-muted">Campos com * sao obrigatorios.</p>
        <button className={`${btnCls} w-full sm:w-auto`}>Salvar perfil</button>
      </form>
    </div>
  );
}
