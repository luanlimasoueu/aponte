import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb, type PlatformEvent } from "@/lib/db";
import { requestEventAccess } from "@/lib/actions";
import { Badge, Card, Flash, btnCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Evento — Ponte" };

const modalityLabel: Record<string, string> = { online: "Online", in_person: "Presencial", hybrid: "Hibrido" };

export default async function EventoPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await getSessionUser();
  const db = getDb();
  const e = db
    .prepare(
      `SELECT e.*, u.name AS owner_name,
        (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved
       FROM events e JOIN users u ON u.id = e.owner_id WHERE e.id = ? AND e.status = 'published'`
    )
    .get(Number(id)) as (PlatformEvent & { owner_name: string; approved: number }) | undefined;
  if (!e) notFound();
  const registration = user?.role === "mentee"
    ? (db.prepare("SELECT status FROM event_registrations WHERE event_id = ? AND user_id = ?").get(e.id, user.id) as { status: string } | undefined)?.status
    : undefined;
  const full = e.capacity !== null && e.approved >= e.capacity;
  const ret = `/eventos/${e.id}`;
  const showLink = e.online_url && registration === "approved";

  return (
    <div className="mx-auto max-w-3xl py-10">
      <Link href="/eventos" className="text-sm text-muted hover:text-fg">← Eventos</Link>
      <Flash params={sp} />
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge kind={e.modality} label={modalityLabel[e.modality]} />
        {e.category && <Badge kind="projeto" label={e.category} />}
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{e.title}</h1>
      <p className="mt-2 text-sm text-muted">Organizado por {e.organizer || e.owner_name}</p>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card><dt className="text-xs text-muted">Quando</dt><dd className="mt-1 text-sm">{new Date(e.starts_at).toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" })} ate {new Date(e.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</dd></Card>
        <Card><dt className="text-xs text-muted">Onde</dt><dd className="mt-1 text-sm">
          {e.location ? `${e.location}${e.city ? ` — ${e.city}${e.state ? `/${e.state}` : ""}` : ""}` : "Online"}
          {e.modality !== "in_person" && <span className="block text-xs text-muted">{showLink ? <a href={e.online_url} className="text-accent underline" target="_blank" rel="noreferrer">Link do encontro</a> : "O link online e liberado para inscricoes confirmadas."}</span>}
        </dd></Card>
        <Card><dt className="text-xs text-muted">Vagas</dt><dd className="mt-1 text-sm">{e.capacity ? `${e.approved}/${e.capacity} confirmadas` : "Sem limite"}</dd></Card>
        <Card><dt className="text-xs text-muted">Inscricao</dt><dd className="mt-1 text-sm">{e.require_approval ? "Sujeita a aprovacao do organizador" : "Confirmacao automatica"}</dd></Card>
      </dl>
      {e.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-fg/85">{e.description}</p>}
      <div className="mt-8">
        {!user ? (
          <Link href="/login" className={btnCls}>Entre para se inscrever</Link>
        ) : user.role !== "mentee" ? (
          <p className="text-sm text-muted">A inscricao e feita por mentorados. Organizadores gerenciam inscricoes no painel.</p>
        ) : registration ? (
          <Badge kind={registration} label={registration === "approved" ? "Inscricao confirmada" : registration === "requested" ? "Aguardando aprovacao" : "Lista de espera"} />
        ) : (
          <form action={requestEventAccess} className="space-y-2">
            <input type="hidden" name="event_id" value={e.id} />
            <input type="hidden" name="return" value={ret} />
            <label className="flex items-start gap-2 text-sm text-muted"><input name="lgpd" type="checkbox" required className="mt-1" />Li o <Link href="/privacidade" className="text-accent underline">aviso de privacidade</Link> e autorizo o uso dos meus dados para gerir esta inscricao.</label>
            <label className="flex items-start gap-2 text-sm text-muted"><input name="communications" type="checkbox" className="mt-1" />Quero receber comunicacoes sobre eventos (opcional).</label>
            <label className="flex items-start gap-2 text-sm text-muted"><input name="image" type="checkbox" className="mt-1" />Autorizo uso de imagem deste evento (opcional).</label>
            <button className={btnCls}>{full ? "Entrar na lista de espera" : "Solicitar inscricao"}</button>
          </form>
        )}
      </div>
    </div>
  );
}
