import { redirect } from "next/navigation";
import { addInvite, adminLogout, removeInvite } from "@/lib/actions";
import { isAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Badge, Card, Empty, Flash, inputCls, btnCls } from "@/components/ui";

interface InviteRow {
  email: string;
  role: string;
  created_at: string;
  user_name: string | null;
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

      <Card>
        <p className="mb-4 text-sm text-muted">
          Emails convidados podem criar conta com o Google. O papel escolhido aqui
          define o papel da pessoa na plataforma.
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
