import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { markNotificationsRead } from "@/lib/edu-actions";
import { Card, Empty, Flash, PageHeader, btnSecondaryCls } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificacoes — Ponte" };

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const rows = await getDb()
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100")
    .all(user.id) as unknown as { id: number; body: string; link: string; read_at: string | null; created_at: string }[];
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <div className="mx-auto max-w-2xl pb-10">
      <PageHeader eyebrow="Notificacoes" title="Avisos da sua rede" />
      <Flash params={sp} />
      {unread > 0 && (
        <form action={markNotificationsRead} className="mb-4">
          <button className={btnSecondaryCls}>Marcar {unread} como lidas</button>
        </form>
      )}
      {rows.length === 0 ? (
        <Empty>Voce nao tem notificacoes.</Empty>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}>
              <Card className={`flex items-center justify-between gap-3 py-3 ${n.read_at ? "opacity-70" : "border-accent/40"}`}>
                <div>
                  <p className="text-sm">{!n.read_at && <span className="sr-only">Nao lida: </span>}{n.body}</p>
                  <p className="text-xs text-muted">{new Date(n.created_at + "Z").toLocaleString("pt-BR")}</p>
                </div>
                {n.link && <Link href={n.link} className="shrink-0 text-sm text-accent hover:underline">Abrir</Link>}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
