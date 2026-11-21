import Link from "next/link";
import { EVENT_CATEGORIES } from "@/lib/catalog";
import { redirect } from "next/navigation";
import { getDb, type User } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  updateProfile,
  respondMentorship,
  removeMentorship,
  addContribution,
  deleteContribution,
  addOpportunity,
  deleteOpportunity,
  checkInEvent,
  confirmSafeHome,
  createMentee,
  createEvent,
  issueCertificate,
  removeAvailability,
  reviewEventRegistration,
  scheduleMentorshipMeeting,
  updateAvailability,
} from "@/lib/actions";
import {
  Badge,
  Card,
  Empty,
  Flash,
  SkillChips,
  TYPE_LABELS,
  inputCls,
  btnCls,
  btnSecondaryCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type SP = { msg?: string; error?: string };

type LinkRow = {
  mentorship_id: number;
  id: number;
  name: string;
  headline: string;
  role: string;
  skills: string;
};

type ContributionRow = {
  id: number;
  title: string;
  url: string;
  type: string;
  description: string;
  endorsements: number;
  endorsers: string | null;
};

type OppRow = {
  id: number;
  type: string;
  title: string;
  description: string;
  created_at: string;
};

type AvailabilityRow = { id: number; weekday: number; start_time: string; end_time: string };
type EventRow = {
  id: number; title: string; modality: string; starts_at: string; ends_at: string;
  location: string; online_url: string; capacity: number | null; require_approval: number;
  approved: number; requested: number;
};
type RegistrationRow = {
  id: number; event_id: number; title: string; modality: string; starts_at: string;
  status: string; checked_in_at: string | null; safe_home_at: string | null;
  participant_id: number; participant_name: string;
};
type MeetingLink = LinkRow & { mentorship_id: number };

const WEEKDAYS = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];

function EventCreator() {
  return (
    <Card>
      <h2 className="font-semibold">Criar evento</h2>
      <p className="mt-1 text-xs text-muted">Online, presencial ou hibrido. Participantes devem aceitar o aviso de privacidade para se inscrever.</p>
      <form action={createEvent} className="mt-3 space-y-3">
        <input name="title" required placeholder="Nome do evento" className={inputCls} />
        <textarea name="description" rows={2} placeholder="Descricao e orientacoes" className={inputCls} />
        <div className="grid gap-3 sm:grid-cols-2">
          <select name="modality" className={inputCls} defaultValue="online">
            <option value="online">Online</option>
            <option value="in_person">Presencial</option>
            <option value="hybrid">Hibrido</option>
          </select>
          <input name="capacity" type="number" min="1" placeholder="Vagas (opcional)" className={inputCls} />
          <input name="starts_at" type="datetime-local" required className={inputCls} />
          <input name="ends_at" type="datetime-local" required className={inputCls} />
        </div>
        <input name="online_url" type="url" placeholder="Link do encontro online" className={inputCls} />
        <input name="location" placeholder="Endereco / local presencial" className={inputCls} />
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="category" aria-label="Categoria" className={inputCls} defaultValue="">
            <option value="">Categoria</option>
            {EVENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input name="city" placeholder="Cidade" aria-label="Cidade" className={inputCls} />
          <input name="state" placeholder="UF" aria-label="Estado (UF)" maxLength={2} className={inputCls} />
        </div>
        <label className="flex items-center gap-2 text-xs text-muted"><input name="require_approval" type="checkbox" /> Aprovar inscricoes manualmente</label>
        <button className={btnSecondaryCls}>Publicar evento</button>
      </form>
    </Card>
  );
}

function MenteeCreator() {
  return <Card><h2 className="font-semibold">Adicionar mentorado</h2><p className="mt-1 text-xs text-muted">O acesso sera criado com uma senha temporaria. Envie-a por um canal seguro; no primeiro login, a pessoa devera trocá-la.</p><form action={createMentee} className="mt-3 space-y-3"><input name="name" required minLength={2} placeholder="Nome completo" className={inputCls}/><input name="email" type="email" required placeholder="email@exemplo.com" className={inputCls}/><input name="temporary_password" type="password" minLength={10} required placeholder="Senha temporaria (minimo 10 caracteres)" className={inputCls}/><button className={btnSecondaryCls}>Criar e vincular mentorado</button></form></Card>;
}

function AvailabilityEditor({ rows }: { rows: AvailabilityRow[] }) {
  return (
    <Card>
      <h2 className="font-semibold">Minha disponibilidade</h2>
      <p className="mt-1 text-xs text-muted">Seu(s) mentor(es) veem apenas estes horarios para facilitar o agendamento.</p>
      <form action={updateAvailability} className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
        <select name="weekday" className={inputCls}>{WEEKDAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}</select>
        <input name="start_time" type="time" required className={inputCls} />
        <input name="end_time" type="time" required className={inputCls} />
        <button className={btnSecondaryCls}>Adicionar</button>
      </form>
      {rows.length > 0 && <ul className="mt-3 space-y-2">{rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between rounded-lg bg-raised px-3 py-2 text-sm"><span>{WEEKDAYS[a.weekday]} · {a.start_time}–{a.end_time}</span><form action={removeAvailability}><input type="hidden" name="id" value={a.id} /><button className="text-xs text-muted hover:text-red-300">remover</button></form></li>
      ))}</ul>}
    </Card>
  );
}

function MyEvents({ events, registrations, owner }: { events: EventRow[]; registrations: RegistrationRow[]; owner: boolean }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{owner ? "Meus eventos" : "Minhas inscricoes"}</h2><Link href="/eventos" className="text-xs text-accent hover:underline">Ver agenda →</Link></div>
      {(owner ? events : registrations).length === 0 ? <div className="mt-2"><Empty>{owner ? "Voce ainda nao publicou eventos." : "Voce ainda nao se inscreveu em eventos."}</Empty></div> : (
        <ul className="mt-3 space-y-3">{owner ? events.map((event) => {
          const participants = registrations.filter((r) => r.event_id === event.id);
          return <li key={event.id} className="rounded-xl border border-line p-3">
            <p className="font-medium"><Badge kind={event.modality} label={event.modality === "in_person" ? "Presencial" : event.modality === "hybrid" ? "Hibrido" : "Online"} /> {event.title}</p>
            <p className="mt-1 text-xs text-muted">{new Date(event.starts_at).toLocaleString("pt-BR")} · {event.approved} confirmado(s){event.capacity ? ` / ${event.capacity}` : ""} · {event.requested} aguardando</p>
            {participants.length > 0 && <ul className="mt-3 space-y-2 border-t border-line pt-2">{participants.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{r.participant_name} · <Badge kind={r.status} label={r.status === "requested" ? "aguardando" : r.status === "approved" ? "confirmado" : "lista de espera"} /></span><div className="flex gap-2">
              {r.status === "requested" && <form action={reviewEventRegistration}><input type="hidden" name="registration_id" value={r.id} /><button name="decision" value="approve" className="text-emerald-300 hover:underline">aprovar</button><button name="decision" value="decline" className="ml-2 text-red-300 hover:underline">recusar</button></form>}
              {r.status === "approved" && !r.checked_in_at && <form action={checkInEvent}><input type="hidden" name="registration_id" value={r.id} /><button className="text-cyan hover:underline">check-in</button></form>}
              {r.checked_in_at && <form action={issueCertificate}><input type="hidden" name="event_id" value={event.id} /><input type="hidden" name="recipient_id" value={r.participant_id} /><button className="text-accent hover:underline">emitir certificado</button></form>}
            </div></li>)}</ul>}
          </li>;
        }) : registrations.map((r) => <li key={r.id} className="rounded-xl border border-line p-3"><p className="font-medium">{r.title}</p><p className="mt-1 text-xs text-muted">{new Date(r.starts_at).toLocaleString("pt-BR")} · <Badge kind={r.status} label={r.status === "requested" ? "aguardando" : r.status === "approved" ? "confirmado" : "lista de espera"} /></p>{["in_person", "hybrid"].includes(r.modality) && r.checked_in_at && !r.safe_home_at && <form action={confirmSafeHome} className="mt-2"><input type="hidden" name="registration_id" value={r.id} /><button className={btnSecondaryCls}>Cheguei bem em casa</button></form>}{r.safe_home_at && <p className="mt-2 text-xs text-emerald-300">✓ Chegada confirmada</p>}</li>)}</ul>
      )}
    </Card>
  );
}

function MeetingPlanner({ links }: { links: MeetingLink[] }) {
  if (!links.length) return null;
  return <Card><h2 className="font-semibold">Agendar encontro de mentoria</h2><form action={scheduleMentorshipMeeting} className="mt-3 grid gap-2 sm:grid-cols-[1.3fr_1.5fr_0.7fr_auto]"><select name="mentorship_id" className={inputCls}>{links.map((l) => <option key={l.mentorship_id} value={l.mentorship_id}>{l.name}</option>)}</select><input name="scheduled_at" type="datetime-local" required className={inputCls}/><input name="duration_minutes" type="number" min="15" max="480" defaultValue="60" className={inputCls}/><button className={btnSecondaryCls}>Agendar</button></form></Card>;
}

function ProfileEditor({ user }: { user: User }) {
  return (
    <Card>
      <h2 className="font-semibold">Editar perfil</h2>
      <form action={updateProfile} className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Titulo / resumo</label>
          <input name="headline" defaultValue={user.headline} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Bio</label>
          <textarea name="bio" defaultValue={user.bio} rows={3} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Especialidades (virgula)</label>
          <input name="skills" defaultValue={user.skills} className={inputCls} />
        </div>
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <input name="public_profile_consent" type="checkbox" defaultChecked={Boolean(user.public_profile_consent)} className="mt-0.5" />
          <span>Permito que meu nome, resumo, bio, habilidades, rede e contribuicoes aparecam no perfil publico. Posso revogar essa permissao a qualquer momento.</span>
        </label>
        <button className={btnSecondaryCls}>Salvar perfil</button>
      </form>
    </Card>
  );
}

function OpportunityEditor({ myOpps }: { myOpps: OppRow[] }) {
  return (
    <Card>
      <h2 className="font-semibold">Publicar oportunidade</h2>
      <p className="mt-1 text-xs text-muted">
        Projetos open source, eventos ou vagas — visiveis para toda a comunidade.
      </p>
      <form action={addOpportunity} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="title" required placeholder="Titulo" className={inputCls} />
          <select name="type" required className={inputCls}>
            <option value="open_source">Open source</option>
            <option value="evento">Evento</option>
            <option value="vaga">Vaga</option>
          </select>
        </div>
        <textarea name="description" rows={2} placeholder="Descricao" className={inputCls} />
        <input name="skills" placeholder="Skills desejadas (virgula)" className={inputCls} />
        <button className={btnSecondaryCls}>Publicar</button>
      </form>
      {myOpps.length > 0 && (
        <ul className="mt-4 space-y-2">
          {myOpps.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg bg-raised px-3 py-2 text-sm">
              <span>
                <Badge kind={o.type} label={TYPE_LABELS[o.type]} /> {o.title}
              </span>
              <form action={deleteOpportunity}>
                <input type="hidden" name="id" value={o.id} />
                <button className="text-xs text-red-400 hover:underline">remover</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PendingRequests({ rows }: { rows: LinkRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Card className="border-accent/50">
      <h2 className="font-semibold">Solicitacoes de mentoria</h2>
      <ul className="mt-3 space-y-3">
        {rows.map((r) => (
          <li key={r.mentorship_id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/pessoas/${r.id}`} className="font-medium text-accent hover:underline">
                {r.name}
              </Link>
              <p className="text-sm text-muted">{r.headline}</p>
              <SkillChips skills={r.skills} />
            </div>
            <form action={respondMentorship} className="flex gap-2">
              <input type="hidden" name="id" value={r.mentorship_id} />
              <button name="decision" value="accept" className={btnCls}>
                Aceitar
              </button>
              <button name="decision" value="decline" className={btnSecondaryCls}>
                Recusar
              </button>
            </form>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NetworkList({ rows, title, empty }: { rows: LinkRow[]; title: string; empty: string }) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <div className="mt-2">
          <Empty>{empty}</Empty>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((r) => (
            <li key={r.mentorship_id} className="flex items-center justify-between gap-3">
              <div>
                <Link href={`/pessoas/${r.id}`} className="font-medium text-accent hover:underline">
                  {r.name}
                </Link>
                <p className="text-sm text-muted">{r.headline}</p>
              </div>
              <form action={removeMentorship}>
                <input type="hidden" name="id" value={r.mentorship_id} />
                <button className="text-xs text-muted/60 hover:text-red-400">desconectar</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.must_change_password) redirect("/primeiro-acesso");
  const sp = await searchParams;
  const db = getDb();

  const links = await db
    .prepare(
      `SELECT m.id AS mentorship_id, m.status, m.mentor_id, m.mentee_id, m.requested_by,
              u.id, u.name, u.headline, u.role, u.skills
       FROM mentorships m
       JOIN users u ON u.id = CASE WHEN m.mentor_id = ? THEN m.mentee_id ELSE m.mentor_id END
       WHERE (m.mentor_id = ? OR m.mentee_id = ?)`
    )
    .all(user.id, user.id, user.id) as unknown as (LinkRow & { status: string; requested_by: string })[];

  const myOpps = await db
    .prepare("SELECT * FROM opportunities WHERE owner_id = ? ORDER BY created_at DESC")
    .all(user.id) as unknown as OppRow[];

  const isMentorSide = user.role === "mentor" || user.role === "company";
  const myEvents = isMentorSide
    ? (await db.prepare(
        `SELECT e.*,
          (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'approved') AS approved,
          (SELECT COUNT(*) FROM event_registrations r WHERE r.event_id = e.id AND r.status = 'requested') AS requested
         FROM events e WHERE e.owner_id = ? ORDER BY e.starts_at DESC`
      ).all(user.id) as unknown as EventRow[])
    : [];
  const eventRegistrations = isMentorSide
    ? (await db.prepare(
        `SELECT r.*, e.title, e.modality, e.starts_at, u.id AS participant_id, u.name AS participant_name
         FROM event_registrations r JOIN events e ON e.id = r.event_id JOIN users u ON u.id = r.user_id
         WHERE e.owner_id = ? AND r.status IN ('requested','approved','waitlist') ORDER BY e.starts_at DESC, r.created_at DESC`
      ).all(user.id) as unknown as RegistrationRow[])
    : (await db.prepare(
        `SELECT r.*, e.title, e.modality, e.starts_at, u.id AS participant_id, u.name AS participant_name
         FROM event_registrations r JOIN events e ON e.id = r.event_id JOIN users u ON u.id = r.user_id
         WHERE r.user_id = ? AND r.status IN ('requested','approved','waitlist') ORDER BY e.starts_at DESC`
      ).all(user.id) as unknown as RegistrationRow[]);
  const availability = user.role === "mentee"
    ? (await db.prepare("SELECT * FROM availability WHERE user_id = ? ORDER BY weekday, start_time").all(user.id) as unknown as AvailabilityRow[])
    : [];

  const incoming = links.filter((l) => l.status === "pending" && isMentorSide && l.requested_by !== "mentor");
  const sentPending = links.filter((l) => l.status === "pending" && !isMentorSide && l.requested_by !== "mentor");
  const network = links.filter((l) => l.status === "active");

  const myContribs =
    user.role === "mentee"
      ? (await db
          .prepare(
            `SELECT c.*,
               (SELECT COUNT(*) FROM endorsements e WHERE e.contribution_id = c.id) AS endorsements,
               (SELECT GROUP_CONCAT(u.name, ' & ') FROM endorsements e JOIN users u ON u.id = e.mentor_id WHERE e.contribution_id = c.id) AS endorsers
             FROM contributions c WHERE c.user_id = ? ORDER BY c.created_at DESC`
          )
          .all(user.id) as unknown as ContributionRow[])
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <Badge kind={user.role} />
      </div>
      <Flash params={sp} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {isMentorSide ? (
            <>
              <PendingRequests rows={incoming} />
              {user.role === "mentor" && <MenteeCreator />}
              <NetworkList
                rows={network}
                title="Minha rede de mentorados"
                empty="Ninguem na sua rede ainda. Aceite solicitacoes de mentoria."
              />
              <MeetingPlanner links={network as MeetingLink[]} />
              {user.role === "company" && (
                <Card className="border-amber-400/40 bg-amber-400/5">
                  <h2 className="font-semibold">Encontrar talentos</h2>
                  <p className="mt-1 text-sm text-muted">
                    Busque mentorados por habilidade e veja contribuicoes reais recomendadas por mentores.
                  </p>
                  <Link href="/talentos" className={`${btnCls} mt-3`}>
                    Buscar talentos
                  </Link>
                </Card>
              )}
            </>
          ) : (
            <>
              <NetworkList
                rows={network}
                title="Meus mentores"
                empty="Voce ainda nao tem mentores. Explore a comunidade e solicite mentoria."
              />
              <MeetingPlanner links={network as MeetingLink[]} />
              {sentPending.length > 0 && (
                <Card>
                  <h2 className="font-semibold">Solicitacoes enviadas</h2>
                  <ul className="mt-3 space-y-2">
                    {sentPending.map((r) => (
                      <li key={r.mentorship_id} className="flex items-center justify-between text-sm">
                        <span>
                          {r.name} <Badge kind="pending" label="aguardando" />
                        </span>
                        <form action={removeMentorship}>
                          <input type="hidden" name="id" value={r.mentorship_id} />
                          <button className="text-xs text-muted/60 hover:text-red-400">cancelar</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              <Card className="border-accent/40 bg-accent/5">
                <h2 className="font-semibold">Encontrar mentores</h2>
                <p className="mt-1 text-sm text-muted">
                  Voce pode ter varios mentores, de areas diferentes.
                </p>
                <Link href="/mentores" className={`${btnCls} mt-3`}>
                  Explorar mentores
                </Link>
              </Card>
              <AvailabilityEditor rows={availability} />
            </>
          )}
          <ProfileEditor user={user} />
        </div>

        <div className="space-y-6">
          {user.role === "mentee" ? (
            <>
              <MyEvents events={myEvents} registrations={eventRegistrations} owner={false} />
              <Card>
                <h2 className="font-semibold">Minhas contribuicoes</h2>
              <p className="mt-1 text-xs text-muted">
                Projetos, PRs, palestras e eventos — visiveis no seu perfil publico para empresas.
              </p>
              <form action={addContribution} className="mt-3 space-y-3">
                <input name="title" required placeholder="Titulo da contribuicao" className={inputCls} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="url" type="url" placeholder="Link (opcional)" className={inputCls} />
                  <select name="type" className={inputCls}>
                    <option value="projeto">Projeto</option>
                    <option value="open_source">Open source</option>
                    <option value="evento">Evento / palestra</option>
                  </select>
                </div>
                <textarea name="description" rows={2} placeholder="O que voce fez?" className={inputCls} />
                <button className={btnSecondaryCls}>Publicar contribuicao</button>
              </form>
              {myContribs.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {myContribs.map((c) => (
                    <li key={c.id} className="rounded-lg bg-raised px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          <Badge kind={c.type} label={TYPE_LABELS[c.type] ?? c.type} /> {c.title}
                        </span>
                        <form action={deleteContribution}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="text-xs text-muted/60 hover:text-red-400">remover</button>
                        </form>
                      </div>
                      {c.endorsements > 0 && (
                        <p className="mt-1 text-xs text-emerald-400">
                          Recomendado por {c.endorsers}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              </Card>
            </>
          ) : (
            <>
              <EventCreator />
              <MyEvents events={myEvents} registrations={eventRegistrations} owner />
              <OpportunityEditor myOpps={myOpps} />
            </>
          )}
          <Card>
            <h2 className="font-semibold">Seu perfil publico</h2>
            <p className="mt-1 text-sm text-muted">
              Qualquer pessoa pode ver seu perfil, rede e contribuicoes.
            </p>
            <Link href={`/pessoas/${user.id}`} className="mt-2 inline-block text-sm text-accent hover:underline">
              Ver meu perfil publico →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
