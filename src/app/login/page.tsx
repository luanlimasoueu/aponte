import Link from "next/link";
import { login } from "@/lib/actions";
import { Card, Flash, inputCls, btnCls } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <Card>
        <h1 className="text-xl font-bold">Entrar na Ponte</h1>
        <div className="mt-4">
          <Flash params={sp} />
        </div>
        <a
          href="/auth/google"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-line bg-raised px-4 py-2 text-sm font-medium text-fg transition-colors hover:border-fg/40"
        >
          Entrar com Google
        </a>
        <div className="mb-4 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          ou com email e senha
          <span className="h-px flex-1 bg-line" />
        </div>
        <form action={login} className="space-y-4">
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
        <p className="mt-4 text-center text-sm text-muted">
          Ainda nao tem conta?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
