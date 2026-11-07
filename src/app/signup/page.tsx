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
        <form action="/auth/google" method="GET" className="space-y-3">
          <input type="hidden" name="signup" value="1" />
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <input name="employment_terms" type="checkbox" required className="mt-0.5" />
            <span>Declaro estar ciente de que a participacao na Ponte, em eventos ou mentorias, nao cria vinculo empregaticio, promessa de contratacao ou relacao de trabalho.</span>
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <input name="code_of_conduct" type="checkbox" required className="mt-0.5" />
            <span>Li e aceito o <Link href="/conduta" className="text-accent underline">Codigo de Conduta</Link>.</span>
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <input name="image_consent" type="checkbox" className="mt-0.5" />
            <span>Autorizo o uso da minha imagem em registros e comunicacoes da Ponte. Esta autorizacao e opcional.</span>
          </label>
          <button className={`${btnCls} w-full`}>
            Continuar com Google
          </button>
        </form>
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
