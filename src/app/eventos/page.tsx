import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { requestEventAccess } from "@/lib/actions";
import { Badge, Card, Empty, Flash, btnCls, btnSecondaryCls, inputCls } from "@/components/ui";
import { EVENT_CATEGORIES } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type EventRow = {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  modality: "online" | "in_person" | "hybrid";
  starts_at: string;
  ends_at: string;
  online_url: string;
  location: string;
  capacity: number | null;
  require_approval: number;
  owner_name: string;
  approved: number;
  category: string;
  city: string;
  state: string;
};

const modalityLabel = { online: "Online", in_person: "Presencial", hybrid: "Hibrido" };

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string; modality?: string; category?: string; city?: string }>;
}) {
  const [sp, user] = await Promise.all([searchParams, getSessionUser()]);
  const db = getDb();
  const allEvents = db.prepare(
    `SELECT e.*, u.name AS owner_name,
      (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved
     FROM events e JOIN users u ON u.id = e.owner_id
     WHERE e.status = 'published' ORDER BY e.starts_at ASC`
  ).all() as unknown as EventRow[];
  const fModality = sp.modality && sp.modality in modalityLabel ? sp.modality : "";
  const fCategory = EVENT_CATEGORIES.includes(sp.category ?? "") ? sp.category! : "";
  const fCity = (sp.city ?? "").trim();
  const cities = [...new Set(allEvents.map((e) => e.city).filter(Boolean))].sort();
  const events = allEvents.filter(
    (e) => (!fModality || e.modality === fModality) && (!fCategory || e.category === fCategory) && (!fCity || e.city === fCity)
  );
  const registrations = user?.role === "mentee"
    ? new Map((db.prepare("SELECT event_id, status FROM event_registrations WHERE user_id = ?").all(user.id) as { event_id: number; status: string }[]).map((r) => [r.event_id, r.status]))
    : new Map<number, string>();

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="mt-1 max-w-2xl text-muted">Encontros online, presenciais e hibridos da comunidade. A inscricao inclui o aviso de privacidade e os consentimentos opcionais.</p>
        </div>
        {user && <Link href="/dashboard" className={btnSecondaryCls}>Gerenciar no painel</Link>}
      </div>
      <Flash params={sp} />
      <form method="GET" action="/eventos" aria-label="Filtros de eventos" className="grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-4">
        <label className="space-y-1 text-sm"><span>Modalidade</span>
          <select name="modality" defaultValue={fModality} className={inputCls}><option value="">Todas</option>{Object.entries(modalityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span>Categoria</span>
          <select name="category" defaultValue={fCategory} className={inputCls}><option value="">Todas</option>{EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="space-y-1 text-sm"><span>Cidade</span>
          <select name="city" defaultValue={fCity} className={inputCls}><option value="">Todas</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <div className="flex items-end gap-2"><button className={btnCls}>Filtrar</button><Link href="/eventos" className={btnSecondaryCls}>Limpar</Link></div>
      </form>

      {events.length === 0 ? <Empty>Nenhum evento publicado ainda.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{events.map((event) => {
        const registration = registrations.get(event.id);
        const full = event.capacity !== null && event.approved >= event.capacity;
        return <Card key={event.id} className="flex flex-col">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><Badge kind={event.modality} label={modalityLabel[event.modality]} />{event.category && <span className="ml-1.5"><Badge kind="projeto" label={event.category} /></span>}<h2 className="mt-2 text-lg font-semibold"><Link href={`/eventos/${event.id}`} className="hover:text-accent">{event.title}</Link></h2></div>
            {event.capacity && <span className="text-xs text-muted">{event.approved}/{event.capacity} vagas</span>}
          </div>
          <p className="mt-2 text-sm text-muted">{new Date(event.starts_at).toLocaleString("pt-BR")} — {new Date(event.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
          {event.description && <p className="mt-3 text-sm text-fg/85">{event.description}</p>}
          {event.location && <p className="mt-3 text-xs text-muted"><span aria-hidden="true">📍 </span>{event.location}{event.city ? ` — ${event.city}${event.state ? `/${event.state}` : ""}` : ""}</p>}
          <p className="mt-3 text-xs text-muted">Organizado por {event.owner_name}{event.require_approval ? " · inscricao sujeita a aprovacao" : ""}</p>
          <div className="mt-4 border-t border-line pt-4">
            {!user ? <Link href="/login" className="text-sm text-accent hover:underline">Entre para solicitar acesso</Link> : user.role !== "mentee" ? <p className="text-xs text-muted">A inscricao e feita por mentorados. Voce gerencia seus eventos no painel.</p> : registration ? <Badge kind={registration} label={registration === "approved" ? "Inscricao confirmada" : registration === "requested" ? "Aguardando aprovacao" : "Lista de espera"} /> : <form action={requestEventAccess} className="space-y-2"><input type="hidden" name="event_id" value={event.id} /><input type="hidden" name="return" value="/eventos" /><label className="flex items-start gap-2 text-xs text-muted"><input name="lgpd" type="checkbox" required className="mt-0.5" />Li o <Link href="/privacidade" className="text-accent underline">aviso de privacidade</Link> e autorizo o uso dos meus dados para gerir esta inscricao e participacao.</label><label className="flex items-start gap-2 text-xs text-muted"><input name="communications" type="checkbox" className="mt-0.5" />Quero receber comunicacoes sobre eventos (opcional).</label><label className="flex items-start gap-2 text-xs text-muted"><input name="image" type="checkbox" className="mt-0.5" />Autorizo uso de imagem deste evento (opcional).</label><button className={btnCls}>{full ? "Entrar na lista de espera" : "Solicitar acesso"}</button></form>}
          </div>
        </Card>;
      })}</div>}
    </div>
  );
}
