import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = getDb().prepare(
    `SELECT c.*, u.name AS recipient_name, issuer.name AS issuer_name, e.starts_at
     FROM certificates c JOIN users u ON u.id = c.user_id JOIN users issuer ON issuer.id = c.issued_by
     LEFT JOIN events e ON e.id = c.event_id WHERE c.verification_code = ?`
  ).get(code.toUpperCase()) as { title: string; verification_code: string; issued_at: string; recipient_name: string; issuer_name: string; starts_at: string | null } | undefined;
  if (!certificate) notFound();
  return <div className="mx-auto max-w-2xl py-12"><Card className="border-accent/40 text-center"><Badge kind="active" label="Certificado verificado" /><p className="mt-7 font-mono text-xs uppercase tracking-[0.18em] text-muted">Ponte certifica que</p><h1 className="mt-3 text-3xl font-bold">{certificate.recipient_name}</h1><p className="mx-auto mt-5 max-w-lg text-muted">participou de <strong className="text-fg">{certificate.title}</strong>{certificate.starts_at ? ` em ${new Date(certificate.starts_at).toLocaleDateString("pt-BR")}` : ""}.</p><div className="mt-8 border-t border-line pt-5 text-xs text-muted"><p>Emitido por {certificate.issuer_name} em {new Date(certificate.issued_at + "Z").toLocaleDateString("pt-BR")}</p><p className="mt-2 font-mono">Codigo: {certificate.verification_code}</p></div></Card></div>;
}
