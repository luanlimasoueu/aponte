import type { Metadata } from "next";
import Link from "next/link";
import { resetPassword } from "@/lib/password-reset";
import { Card, Flash, btnCls, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Nova senha — Ponte" };

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="text-xl font-bold">Criar nova senha</h1>
        <div className="mt-4"><Flash params={{ error: sp.error }} /></div>
        {!sp.token ? (
          <p className="text-sm text-muted">Link invalido. <Link href="/esqueci-senha" className="text-accent hover:underline">Peca um novo link</Link>.</p>
        ) : (
          <form action={resetPassword} className="space-y-3">
            <input type="hidden" name="token" value={sp.token} />
            <label className="block space-y-1 text-sm">
              <span>Nova senha (minimo 10 caracteres)</span>
              <input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Confirme a nova senha</span>
              <input name="confirmation" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
            </label>
            <button className={`${btnCls} w-full`}>Salvar nova senha</button>
          </form>
        )}
      </Card>
    </div>
  );
}
