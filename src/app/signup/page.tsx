import Link from "next/link";
import { Card, Flash, btnCls } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="text-xl font-bold">Criar conta na Ponte</h1>
        <div className="mt-4">
          <Flash params={sp} />
        </div>
        <p className="mb-4 text-sm text-muted">
          O cadastro e feito com sua conta Google e exige convite. Peca para o
          administrador da Ponte incluir seu email na lista de convidados.
        </p>
        <a href="/auth/google" className={`${btnCls} w-full`}>
          Continuar com Google
        </a>
        <p className="mt-4 text-center text-sm text-muted">
          Ja tem conta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Entrar
          </Link>
        </p>
      </Card>
    </div>
  );
}
