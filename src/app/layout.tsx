import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { getDb } from "@/lib/db";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Ponte — mentoria entre geracoes de profissionais",
  description:
    "Comunidade que conecta profissionais experientes a pessoas em inicio de carreira ou transicao, em qualquer idade.",
};

const NAV = [
  { href: "/mentores", label: "Mentores" },
  { href: "/talentos", label: "Talentos" },
  { href: "/projetos", label: "Projetos" },
  { href: "/eventos", label: "Eventos" },
  { href: "/oportunidades", label: "Oportunidades" },
];

const USER_NAV = [
  { href: "/aprendizado", label: "Aprendizado" },
  { href: "/perfil", label: "Meu perfil" },
];

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const unread = user
    ? (getDb().prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(user.id) as { n: number }).n
    : 0;
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body className="min-h-screen bg-ink font-sans text-fg antialiased">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-ink">
          Pular para o conteudo
        </a>
        <header className="border-b border-line bg-ink">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
            <div className="flex items-center gap-10">
              <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="4" cy="13" r="2.4" fill="#9db4ff" />
                  <circle cx="14" cy="5" r="2.4" fill="#9db4ff" />
                  <path d="M5.6 11.4 12.4 6.6" stroke="#9db4ff" strokeWidth="1.2" />
                </svg>
                Ponte
              </Link>
              <nav aria-label="Principal" className="hidden items-center gap-6 text-sm text-muted md:flex">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="transition-colors hover:text-fg">
                    {n.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="hidden items-center gap-5 text-sm md:flex">
              {user ? (
                <>
                  <Link href="/aprendizado" className="text-muted transition-colors hover:text-fg">Aprendizado</Link>
                  <Link href="/notificacoes" className="relative text-muted transition-colors hover:text-fg" aria-label={`Notificacoes${unread ? `, ${unread} nao lidas` : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    {unread > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 text-[10px] font-bold text-ink">{unread}</span>}
                  </Link>
                  <Link
                    href="/dashboard"
                    className="font-medium text-fg/90 transition-colors hover:text-fg"
                  >
                    {user.name.split(" ")[0]}
                  </Link>
                  <form action={logout}>
                    <button className="text-muted transition-colors hover:text-fg cursor-pointer">
                      Sair
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-muted transition-colors hover:text-fg">
                    Entrar
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>
            <details className="group relative md:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-md border border-line text-muted">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M2.5 5.5h13M2.5 9h13M2.5 12.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Menu</span>
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-lg border border-line bg-surface p-2 shadow-2xl shadow-black/50">
                <nav className="flex flex-col text-sm">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className="rounded-md px-3 py-2.5 text-muted transition-colors hover:bg-raised hover:text-fg"
                    >
                      {n.label}
                    </Link>
                  ))}
                  <div className="my-2 border-t border-line" />
                  {user ? (
                    <>
                      {USER_NAV.concat([{ href: "/notificacoes", label: `Notificacoes${unread ? ` (${unread})` : ""}` }]).map((n) => (
                        <Link key={n.href} href={n.href} className="rounded-md px-3 py-2.5 text-muted transition-colors hover:bg-raised hover:text-fg">
                          {n.label}
                        </Link>
                      ))}
                      <Link
                        href="/dashboard"
                        className="rounded-md px-3 py-2.5 font-medium text-fg transition-colors hover:bg-raised"
                      >
                        {user.name}
                      </Link>
                      <form action={logout}>
                        <button className="w-full rounded-md px-3 py-2.5 text-left text-muted transition-colors hover:bg-raised hover:text-fg cursor-pointer">
                          Sair
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="rounded-md px-3 py-2.5 text-muted transition-colors hover:bg-raised hover:text-fg"
                      >
                        Entrar
                      </Link>
                      <Link
                        href="/signup"
                        className="mt-1 rounded-md bg-accent px-3 py-2.5 text-center font-semibold text-ink"
                      >
                        Criar conta
                      </Link>
                    </>
                  )}
                </nav>
              </div>
            </details>
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-6xl px-5">{children}</main>
        <footer className="mt-24 border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-8 text-xs text-muted/70 sm:flex-row">
            <span>Ponte — conecta quem quer aprender com quem pode ensinar.</span>
            <nav aria-label="Rodape" className="flex gap-4">
              <Link href="/sou-mentor" className="hover:text-fg">Sou Mentor</Link>
              <Link href="/sou-mentorado" className="hover:text-fg">Sou Mentorado</Link>
              <Link href="/sou-empresa" className="hover:text-fg">Sou Empresa</Link>
              <Link href="/conduta" className="hover:text-fg">Conduta</Link>
            </nav>
            <span>Contas de demo: ana@ponte.dev / senha123</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
