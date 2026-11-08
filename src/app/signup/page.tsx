import Link from "next/link";
import { registerAccount } from "@/lib/actions";
import { Card, Flash, btnCls, inputCls } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="text-xl font-bold">Solicitar acesso a Ponte</h1>
        <div className="mt-4">
          <Flash params={sp} />
        </div>
        <p className="mb-4 text-sm text-muted">
          Mentores e mentorados podem solicitar cadastro. O administrador analisa
          e libera a conta antes do primeiro login.
        </p>
        <form action={registerAccount} className="space-y-3">
          <input name="name" required minLength={2} placeholder="Nome completo" className={inputCls} />
          <input name="email" type="email" required placeholder="email@exemplo.com" className={inputCls} />
          <select name="role" className={inputCls} defaultValue="mentee">
            <option value="mentee">Quero ser mentorado(a)</option>
            <option value="mentor">Quero ser mentor(a)</option>
          </select>
          <input name="password" type="password" required minLength={10} placeholder="Crie uma senha (minimo 10 caracteres)" className={inputCls} />
          <input name="confirmation" type="password" required minLength={10} placeholder="Confirme a senha" className={inputCls} />
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
          <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <input name="public_profile_consent" type="checkbox" required className="mt-0.5" />
            <span>Estou ciente de que meu nome, resumo profissional, bio, habilidades, rede e contribuicoes podem ficar visiveis publicamente na comunidade. Posso alterar essa visibilidade mais tarde no meu perfil.</span>
          </label>
          <button className={`${btnCls} w-full`}>
            Enviar cadastro para aprovacao
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
