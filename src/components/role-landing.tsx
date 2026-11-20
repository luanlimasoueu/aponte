import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getProfile, profileCompleteness } from "@/lib/db";
import { Eyebrow, ROLE_LABELS, btnCls, btnSecondaryCls } from "@/components/ui";

export type RoleLandingConfig = {
  role: "mentor" | "mentee" | "company";
  eyebrow: string;
  title: string;
  intro: string;
  features: { title: string; description: string }[];
  journey: string[];
  actions: { href: string; label: string }[];
  publicLink: { href: string; label: string };
};

export async function RoleLanding({ config }: { config: RoleLandingConfig }) {
  const user = await getSessionUser();
  const sameRole = user?.role === config.role;
  const completeness = sameRole ? Math.round(profileCompleteness(await getProfile(user!.id), user!.role) * 100) : 0;
  return (
    <div className="py-12">
      <Eyebrow>{config.eyebrow}</Eyebrow>
      <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{config.title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{config.intro}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {!user && (
          <>
            <Link href={`/signup?role=${config.role}`} className={`${btnCls} px-6 py-3`}>Criar conta como {ROLE_LABELS[config.role].replace("(a)", "")}</Link>
            <Link href="/login" className={`${btnSecondaryCls} px-6 py-3`}>Ja tenho conta</Link>
          </>
        )}
        {user && !sameRole && (
          <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
            Voce esta conectado(a) como {ROLE_LABELS[user.role]}. Esta area mostra o que este perfil pode fazer na Ponte.
          </p>
        )}
        <Link href={config.publicLink.href} className={`${btnSecondaryCls} px-6 py-3`}>{config.publicLink.label}</Link>
      </div>

      {sameRole && (
        <section aria-labelledby="area" className="mt-10 rounded-lg border border-line bg-surface p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 id="area" className="font-semibold">Sua area</h2>
              <p className="mt-1 text-sm text-muted">Perfil {completeness}% completo{completeness < 100 ? " — complete para melhorar as recomendacoes." : "."}</p>
              <div className="mt-2 h-1.5 w-56 rounded-full bg-raised" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-accent" style={{ width: `${completeness}%` }} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.actions.map((a, i) => (
                <Link key={a.href} href={a.href} className={i === 0 ? btnCls : btnSecondaryCls}>{a.label}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="recursos" className="mt-16 border-t border-line pt-12">
        <h2 id="recursos" className="text-2xl font-bold tracking-tight">O que voce pode fazer</h2>
        <div className="mt-8 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {config.features.map((f, i) => (
            <div key={f.title} className="border-t border-line pt-5">
              <span className="font-mono text-xs text-accent">0{i + 1}</span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="jornada" className="mt-16 border-t border-line pt-12">
        <h2 id="jornada" className="text-2xl font-bold tracking-tight">Sua jornada</h2>
        <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          {config.journey.map((step, i) => (
            <li key={step} className="flex items-center gap-3">
              <span className="rounded-full border border-line px-4 py-2 text-sm">
                <span className="mr-2 font-mono text-xs text-accent">{i + 1}</span>
                {step}
              </span>
              {i < config.journey.length - 1 && <span aria-hidden="true" className="hidden text-muted sm:inline">→</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
