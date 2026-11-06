import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { changeInitialPassword } from "@/lib/actions";
import { Card, Flash, btnCls, inputCls } from "@/components/ui";

export default async function FirstAccessPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, sp] = await Promise.all([getSessionUser(), searchParams]);
  if (!user) redirect("/login");
  if (!user.must_change_password) redirect("/dashboard");
  return <div className="mx-auto max-w-md py-12"><Card><h1 className="text-xl font-bold">Defina sua senha</h1><p className="mt-2 text-sm text-muted">Seu mentor criou este acesso com uma senha temporaria. Para continuar, crie uma senha pessoal com pelo menos 10 caracteres.</p><div className="mt-4"><Flash params={sp} /></div><form action={changeInitialPassword} className="mt-4 space-y-3"><input name="password" type="password" minLength={10} required placeholder="Nova senha" className={inputCls}/><input name="confirmation" type="password" minLength={10} required placeholder="Confirme a nova senha" className={inputCls}/><button className={`${btnCls} w-full`}>Salvar e continuar</button></form></Card></div>;
}
