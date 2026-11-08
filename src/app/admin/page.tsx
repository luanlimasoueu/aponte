import { redirect } from "next/navigation";
import { addInvite, adminLogout, removeInvite, reviewAccount } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge, Card, Empty, Flash, inputCls, btnCls } from "@/components/ui";

interface InviteRow {
  email: string;
  role: string;
  created_at: string;
  user_name: string | null;
}

interface PendingUserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; error?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;

  const invites = getDb()
    .prepare(
      `SELECT i.email, i.role, i.created_at, u.name AS user_name
       FROM invites i LEFT JOIN users u ON u.email = i.email
       ORDER BY i.created_at DESC`
    )
    .all() as unknown as InviteRow[];
  const pendingUsers = getDb()
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE account_status = 'pending' ORDER BY created_at ASC")
    .all() as unknown as PendingUserRow[];

  return (
    <div className="mx-auto max-w-2xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Convites</h1>
        <form action={adminLogout}>
          <button className="text-sm text-muted transition-colors hover:text-fg cursor-pointer">
            Sair do admin
          </button>
        </form>
      </div>
      <Flash params={sp} />

      <Card className="border-accent/40">
        <h2 className="font-semibold">Cadastros aguardando aprovacao</h2>
        <p className="mt-1 text-sm text-muted">Mentores e mentorados so podem entrar apos sua aprovacao.</p>
        {pendingUsers.length === 0 ? (
          <div className="mt-3"><Empty>Nenhum cadastro aguardando analise.</Empty></div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {pendingUsers.map((user) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="font-medium">{user.name} <Badge kind={user.role} /></p><p className="text-xs text-muted">{user.email}</p></div>
                <form action={reviewAccount} className="flex gap-2"><input type="hidden" name="id" value={user.id} /><button name="decision" value="approve" className={btnCls}>Aprovar</button><button name="decision" value="reject" className="text-sm text-red-300 hover:underline">Recusar</button></form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Convites Google (legado)</h2>
        <p className="mb-4 text-sm text-muted">
          Use esta opcao somente para o fluxo Google ja existente. Para novos
          mentores e mentorados, oriente o cadastro direto e aprove-o acima.
        </p>
        <form action={addInvite} className="flex flex-col gap-3 sm:flex-row">
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className={`${inputCls} flex-1`}
          />
          <select name="role" className={inputCls} defaultValue="mentee">
            <option value="mentee">Mentorado(a)</option>
            <option value="mentor">Mentor(a)</option>
            <option value="company">Empresa</option>
          </select>
          <button type="submit" className={btnCls}>
            Convidar
          </button>
        </form>
      </Card>

      <Card>
        {invites.length === 0 ? (
          <Empty>Nenhum convite ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {invites.map((i) => (
              <li key={i.email} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted">
                    {i.user_name ? `Cadastrado como ${i.user_name}` : "Aguardando cadastro"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge kind={i.role} />
                  <form action={removeInvite}>
                    <input type="hidden" name="email" value={i.email} />
                    <button className="text-xs text-muted transition-colors hover:text-red-300 cursor-pointer">
                      Remover
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
