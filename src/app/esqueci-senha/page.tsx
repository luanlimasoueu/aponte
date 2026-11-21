import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/lib/password-reset";
import { Card, Flash, btnCls, inputCls } from "@/components/ui";

export const metadata: Metadata = { title: "Esqueci minha senha — Ponte" };

export default async function EsqueciSenhaPage({ searchParams }: { searchParams: Promise<{ msg?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="text-xl font-bold">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-muted">Informe o email da sua conta. Enviaremos um link para criar uma nova senha.</p>
        <div className="mt-4"><Flash params={sp} /></div>
        <form action={requestPasswordReset} className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" className={inputCls} />
          </label>
          <button className={`${btnCls} w-full`}>Enviar link</button>
        </form>
        <p className="mt-4 text-center text-sm text-muted"><Link href="/login" className="text-accent hover:underline">Voltar para o login</Link></p>
      </Card>
    </div>
  );
}
