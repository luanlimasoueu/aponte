import Link from "next/link";
import { registerAccount } from "@/lib/actions";
import { Card, Flash, btnCls, inputCls } from "@/components/ui";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; role?: string }>;
}) {
  const sp = await searchParams;
  const role = ["mentor", "mentee", "company"].includes(sp.role ?? "") ? sp.role : "mentee";
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <h1 className="text-xl font-bold">Solicitar acesso a Ponte</h1>
        <div className="mt-4">
          <Flash params={sp} />
        </div>
        <p className="mb-4 text-sm text-muted">
          Mentores, mentorados e empresas podem solicitar cadastro. O administrador analisa
          e libera a conta antes do primeiro login. Depois, complete seu perfil para
          receber recomendacoes por compatibilidade.
        </p>
        <form action={registerAccount} className="space-y-3">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Como voce quer participar?</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["mentee", "Sou Mentorado"],
                ["mentor", "Sou Mentor"],
                ["company", "Sou Empresa"],
              ].map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center justify-center rounded-md border border-line px-2 py-2.5 text-center text-xs font-medium text-muted has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                  <input type="radio" name="role" value={value} defaultChecked={role === value} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block space-y-1 text-sm">
            <span>Nome completo ou nome da empresa</span>
            <input name="name" required minLength={2} autoComplete="name" className={inputCls} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Email</span>
            <input name="email" type="email" required autoComplete="email" placeholder="email@exemplo.com" className={inputCls} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Senha (minimo 10 caracteres)</span>
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Confirme a senha</span>
            <input name="confirmation" type="password" required minLength={10} autoComplete="new-password" className={inputCls} />
          </label>
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
