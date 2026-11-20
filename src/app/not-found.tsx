import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Pagina nao encontrada</h1>
      <p className="mt-3 text-muted">O conteudo nao existe ou voce nao tem permissao para ve-lo.</p>
      <Link href="/" className="mt-8 inline-flex rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink hover:bg-accent-strong">
        Voltar ao inicio
      </Link>
    </div>
  );
}
