import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge, Card, Empty, PageHeader, btnSecondaryCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meus eventos — Ponte" };

const STATUS: Record<string, string> = { approved: "Confirmada", requested: "Aguardando aprovacao", waitlist: "Lista de espera", declined: "Recusada", cancelled: "Cancelada" };

type Ev = { id: number; title: string; starts_at: string; modality: string; capacity: number | null };
type Reg = { event_id: number; name: string; email: string; role: string; status: string; checked_in_at: string | null };

export default async function MeusEventosPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const events = (await db.prepare("SELECT id, title, starts_at, modality, capacity FROM events WHERE owner_id = ? ORDER BY starts_at DESC").all(user.id)) as unknown as Ev[];
  const regs = (await db.prepare(
    `SELECT r.event_id, u.name, u.email, u.role, r.status, r.checked_in_at FROM event_registrations r
     JOIN users u ON u.id = r.user_id JOIN events e ON e.id = r.event_id
     WHERE e.owner_id = ? ORDER BY u.name`
  ).all(user.id)) as unknown as Reg[];
  const mine = user.role === "mentee"
    ? ((await db.prepare(
        `SELECT e.id, e.title, e.starts_at, r.status FROM event_registrations r JOIN events e ON e.id = r.event_id WHERE r.user_id = ? ORDER BY e.starts_at DESC`
      ).all(user.id)) as unknown as { id: number; title: string; starts_at: string; status: string }[])
    : [];
  return (
    <div className="pb-10">
      <PageHeader eyebrow="Minha conta" title="Meus eventos">
        {user.role === "mentee" ? "Eventos em que voce se inscreveu." : "Eventos que voce cadastrou e as pessoas inscritas em cada um."}
      </PageHeader>
      {user.role !== "mentee" && <Link href="/dashboard" className={`${btnSecondaryCls} mb-6`}>Cadastrar evento no painel</Link>}
      {user.role === "mentee" ? (
        mine.length === 0 ? <Empty>Voce ainda nao se inscreveu em eventos. <Link href="/eventos" className="text-accent underline">Ver eventos</Link></Empty> : (
          <ul className="space-y-2">
            {mine.map((e) => (
              <li key={e.id}><Card className="flex items-center justify-between gap-3 py-3">
                <Link href={`/eventos/${e.id}`} className="text-accent hover:underline">{e.title}</Link>
                <Badge kind={e.status} label={STATUS[e.status] ?? e.status} />
              </Card></li>
            ))}
          </ul>
        )
      ) : events.length === 0 ? <Empty>Voce ainda nao cadastrou eventos.</Empty> : (
        <ul className="space-y-4">
          {events.map((e) => {
            const list = regs.filter((r) => r.event_id === e.id);
            return (
              <li key={e.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/eventos/${e.id}`} className="text-lg font-semibold text-accent hover:underline">{e.title}</Link>
                    <span className="text-xs text-muted">{new Date(e.starts_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })} · {list.length} inscritos{e.capacity ? ` / ${e.capacity} vagas` : ""}</span>
                  </div>
                  {list.length === 0 ? <p className="mt-3 text-sm text-muted">Nenhuma pessoa inscrita ainda.</p> : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs text-muted"><tr><th className="py-1 font-medium">Nome</th><th className="font-medium">Email</th><th className="font-medium">Inscricao</th><th className="font-medium">Check-in</th></tr></thead>
                        <tbody>
                          {list.map((r) => (
                            <tr key={r.email} className="border-t border-line">
                              <td className="py-1.5">{r.name}</td>
                              <td className="text-muted">{r.email}</td>
                              <td><Badge kind={r.status} label={STATUS[r.status] ?? r.status} /></td>
                              <td className="text-muted">{r.checked_in_at ? "Sim" : "Nao"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
