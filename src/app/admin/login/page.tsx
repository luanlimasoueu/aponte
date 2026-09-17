import { adminLogin } from "@/lib/actions";
import { Card, Flash, inputCls, btnCls } from "@/components/ui";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <Card>
        <h1 className="text-xl font-bold">Administração</h1>
        <div className="mt-4">
          <Flash params={sp} />
        </div>
        <form action={adminLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input name="email" type="email" required className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Senha</label>
            <input name="password" type="password" required className={inputCls} />
          </div>
          <button type="submit" className={`${btnCls} w-full`}>
            Entrar
          </button>
        </form>
      </Card>
    </div>
  );
}
