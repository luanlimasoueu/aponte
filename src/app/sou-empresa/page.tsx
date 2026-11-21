import type { Metadata } from "next";
import { RoleLanding } from "@/components/role-landing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sou Empresa — Ponte" };

export default function SouEmpresaPage() {
  return (
    <RoleLanding
      config={{
        role: "company",
        eyebrow: "Sou Empresa",
        title: "Forme talentos em projetos reais",
        intro: "Publique projetos empresariais ou educacionais e encontre mentorados compativeis com as ferramentas, o nivel e a disponibilidade de que voce precisa.",
        features: [
          { title: "Cadastro da empresa", description: "Tipo, setor, site, responsavel e localizacao." },
          { title: "Projetos empresariais", description: "Descricao, objetivos, ferramentas, nivel, carga horaria, vagas e tipo de oportunidade." },
          { title: "Busca de mentorados", description: "Compatibilidade por ferramentas, tipo de projeto, nivel, objetivos de aprendizado, disponibilidade e modalidade." },
          { title: "Gestao de candidaturas", description: "Aceite ou recuse candidaturas; os mentorados recebem uma notificacao." },
          { title: "Privacidade respeitada", description: "Empresas nunca acessam projetos particulares dos mentorados." },
          { title: "Eventos", description: "Organize eventos para apresentar projetos e conhecer talentos." },
        ],
        journey: ["Cadastro", "Projeto", "Busca de mentorados", "Candidaturas", "Acompanhamento"],
        actions: [
          { href: "/projetos/novo", label: "Publicar projeto" },
          { href: "/talentos", label: "Buscar mentorados" },
          { href: "/perfil", label: "Dados da empresa" },
        ],
        publicLink: { href: "/projetos", label: "Ver projetos" },
      }}
    />
  );
}
