import Link from "next/link";
import { Badge, Eyebrow } from "@/components/ui";
import { getDb, type PlatformEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

const PATHS = [
  {
    href: "/sou-mentor",
    label: "Sou Mentor",
    description: "Compartilhe o que voce sabe: acompanhe mentorados, oriente projetos e de feedback sobre a evolucao de cada um.",
  },
  {
    href: "/sou-mentorado",
    label: "Sou Mentorado",
    description: "Encontre mentores compativeis com o que voce quer aprender, crie projetos e acompanhe suas metas.",
  },
  {
    href: "/sou-empresa",
    label: "Sou Empresa",
    description: "Publique projetos reais e encontre mentorados com as ferramentas e os objetivos que voce procura.",
  },
];

const MODALITY_LABEL: Record<string, string> = { online: "Online", in_person: "Presencial", hybrid: "Hibrido" };

const AUDIENCES = [
  {
    title: "Para quem esta comecando",
    description:
      "Monte sua rede com varios mentores, participe de projetos open source e eventos, e mostre suas contribuicoes em um perfil publico que fala por voce no mercado.",
    href: "/sou-mentorado",
    link: "Criar perfil de mentorado",
  },
  {
    title: "Para mentores",
    description:
      "Compartilhe sua experiencia, monte sua rede de mentorados e recomende as contribuicoes deles. Colabore tambem em projetos e eventos de outros especialistas.",
    href: "/sou-mentor",
    link: "Quero ser mentor",
  },
  {
    title: "Para empresas",
    description:
      "Atue como mentora e forme talentos do seu jeito, publique vagas e encontre profissionais juniores com contribuicoes reais — avaliadas por mentores.",
    href: "/sou-empresa",
    link: "Area para empresas",
  },
];

const STEPS = [
  {
    title: "Crie seu perfil",
    description:
      "Mentor, mentorado ou empresa — cada papel tem um espaco na rede.",
  },
  {
    title: "Conecte-se",
    description:
      "Mentorados pedem mentoria; mentores aceitam e passam a fazer parte da mesma rede.",
  },
  {
    title: "Construa em publico",
    description:
      "Contribuicoes recomendadas por mentores viram evidencia real para empresas que buscam talento.",
  },
];

function NetworkVisual() {
  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      className="h-auto w-full max-w-[520px]"
      role="img"
      aria-label="Visual abstrato de uma rede de conexoes"
    >
      <defs>
        <radialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9db4ff" stopOpacity="0.16" />
          <stop offset="55%" stopColor="#9db4ff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#9db4ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="260" cy="260" r="250" fill="url(#heroGlow)" />

      {/* orbits */}
      <circle cx="260" cy="260" r="210" stroke="rgba(174,185,187,0.18)" strokeWidth="1" />
      <circle cx="260" cy="260" r="150" stroke="rgba(174,185,187,0.14)" strokeWidth="1" strokeDasharray="2 7" />
      <g className="origin-[260px_260px] animate-[spin_90s_linear_infinite]">
        <circle cx="260" cy="260" r="90" stroke="rgba(174,185,187,0.2)" strokeWidth="1" />
        <circle cx="345" cy="229" r="4" fill="#0c1720" stroke="#9db4ff" strokeWidth="1.4" />
        <circle cx="229" cy="345" r="4" fill="#0c1720" stroke="#9db4ff" strokeWidth="1.4" />
      </g>

      {/* connections */}
      <g stroke="rgba(174,185,187,0.28)" strokeWidth="1">
        <line x1="260" y1="260" x2="345" y2="229" />
        <line x1="260" y1="260" x2="229" y2="345" />
        <line x1="345" y1="229" x2="390" y2="335" />
        <line x1="345" y1="229" x2="332" y2="63" />
        <line x1="229" y1="345" x2="62" y2="332" />
        <line x1="119" y1="209" x2="164" y2="145" />
        <line x1="119" y1="209" x2="260" y2="260" />
      </g>

      {/* outer nodes */}
      <circle cx="332" cy="63" r="5" fill="#0c1720" stroke="#9db4ff" strokeWidth="1.4" />
      <circle cx="62" cy="332" r="5" fill="#0c1720" stroke="#9db4ff" strokeWidth="1.4" />
      <circle cx="390" cy="335" r="4" fill="#9db4ff" fillOpacity="0.9" />
      <circle cx="119" cy="209" r="4" fill="#9db4ff" fillOpacity="0.9" />
      <circle cx="164" cy="145" r="3" fill="#9db4ff" fillOpacity="0.5" />
      <circle cx="447" cy="190" r="3" fill="#9db4ff" fillOpacity="0.4" />
      <circle cx="150" cy="430" r="3" fill="#9db4ff" fillOpacity="0.4" />

      {/* center node */}
      <circle cx="260" cy="260" r="26" stroke="rgba(157,180,255,0.35)" strokeWidth="1" />
      <circle cx="260" cy="260" r="14" fill="#9db4ff" fillOpacity="0.15" />
      <circle cx="260" cy="260" r="8" fill="#9db4ff" />
    </svg>
  );
}

export default async function Home() {
  const db = getDb();
  const events = await db
    .prepare("SELECT * FROM events WHERE status = 'published' AND ends_at >= ? ORDER BY starts_at LIMIT 3")
    .all(new Date().toISOString().slice(0, 16)) as unknown as PlatformEvent[];
  const count = async (sql: string) => ((await db.prepare(sql).get()) as { n: number }).n;
  const stats = [
    { value: await count("SELECT COUNT(*) AS n FROM users WHERE role = 'mentor' AND account_status = 'active'"), label: "mentores ativos" },
    { value: await count("SELECT COUNT(*) AS n FROM users WHERE role = 'mentee' AND account_status = 'active'"), label: "mentorados" },
    { value: await count("SELECT COUNT(*) AS n FROM mentorships WHERE status = 'active'"), label: "mentorias em andamento" },
    { value: await count("SELECT COUNT(*) AS n FROM projects WHERE kind != 'particular' AND visibility = 'public' AND status NOT IN ('rascunho','arquivado')"), label: "projetos abertos a comunidade" },
  ];
  return (
    <div>
      {/* Hero */}
      <section className="grid items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Eyebrow>Comunidade aberta de mentoria</Eyebrow>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
            A ponte entre quem
            <br />
            ja trilhou o caminho
            <br />e <span className="text-accent">quem esta comecando</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted">
            Comunidade aberta que conecta profissionais experientes a pessoas em
            inicio de carreira ou transicao — em qualquer idade e qualquer area.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
            >
              Entrar para a comunidade
            </Link>
            <Link
              href="/mentores"
              className="inline-flex items-center justify-center rounded-md border border-line px-6 py-3 font-medium text-fg transition-colors hover:border-fg/40 hover:bg-raised"
            >
              Explorar mentores
            </Link>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <NetworkVisual />
        </div>
      </section>

      {/* Tres acessos */}
      <section aria-labelledby="caminhos" className="pb-20">
        <h2 id="caminhos" className="sr-only">Escolha como voce quer participar</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PATHS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col rounded-lg border border-line bg-surface p-6 transition-colors hover:border-accent focus-visible:border-accent"
            >
              <span className="text-xl font-bold tracking-tight">{p.label}</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-muted">{p.description}</span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Comecar <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 01 — Quem participa */}
      <section className="border-t border-line py-20">
        <div className="grid gap-12 lg:grid-cols-[200px_1fr]">
          <div>
            <span className="font-mono text-xs text-muted">01</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Quem participa</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Tres papeis, uma mesma rede.
            </p>
          </div>
          <div className="grid gap-x-10 gap-y-12 sm:grid-cols-3">
            {AUDIENCES.map((a, i) => (
              <div
                key={a.title}
                className="group border-t border-line pt-6 transition-colors duration-300 hover:border-accent"
              >
                <span className="font-mono text-xs text-muted">0{i + 1}</span>
                <h3 className="mt-4 font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a.description}</p>
                <Link
                  href={a.href}
                  className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  {a.link}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 02 — Como funciona */}
      <section className="border-t border-line py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_200px]">
          <div className="order-2 grid gap-x-10 gap-y-12 sm:grid-cols-3 lg:order-1">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="group border-t border-line pt-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent"
              >
                <span className="font-mono text-xs text-accent">0{i + 1}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="order-1 lg:order-2 lg:text-right">
            <span className="font-mono text-xs text-muted">02</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Como funciona</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted lg:ml-auto lg:max-w-[200px]">
              Um processo simples, do perfil a evidencia publica.
            </p>
          </div>
        </div>
      </section>

      {/* 03 — Eventos e impacto */}
      <section className="border-t border-line py-20">
        <div className="grid gap-12 lg:grid-cols-[200px_1fr]">
          <div>
            <span className="font-mono text-xs text-muted">03</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Proximos eventos</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Abertos a todos os perfis, online e presenciais.</p>
            <Link href="/eventos" className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent">
              Ver todos <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="space-y-10">
            {events.length === 0 ? (
              <p className="text-sm text-muted">Nenhum evento publicado no momento.</p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-3">
                {events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/eventos/${e.id}`} className="block h-full rounded-lg border border-line p-5 transition-colors hover:border-accent">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge kind={e.modality} label={MODALITY_LABEL[e.modality]} />
                        {e.category && <Badge kind="projeto" label={e.category} />}
                      </div>
                      <p className="mt-3 font-semibold">{e.title}</p>
                      <p className="mt-2 text-xs text-muted">
                        {new Date(e.starts_at).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" })}
                        {e.city ? ` · ${e.city}${e.state ? `/${e.state}` : ""}` : ""}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <dl className="grid grid-cols-2 gap-6 border-t border-line pt-8 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-xs text-muted">{s.label}</dt>
                  <dd className="mt-1 text-3xl font-bold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-line py-20">
        <div className="flex flex-col items-start justify-between gap-8 rounded-lg border border-line bg-surface px-8 py-12 sm:px-12 lg:flex-row lg:items-center">
          <div>
            <Eyebrow>Ponte</Eyebrow>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Comunidade aberta de mentoria, em qualquer idade e qualquer area.
            </h2>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
            >
              Entrar para a comunidade
            </Link>
            <Link
              href="/mentores"
              className="inline-flex items-center justify-center rounded-md border border-line px-6 py-3 font-medium text-fg transition-colors hover:border-fg/40 hover:bg-raised"
            >
              Explorar mentores
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
