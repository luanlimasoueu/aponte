import type { Metadata } from "next";
import { RoleLanding } from "@/components/role-landing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sou Mentorado — Ponte" };

export default function SouMentoradoPage() {
  return (
    <RoleLanding
      config={{
        role: "mentee",
        eyebrow: "Sou Mentorado",
        title: "Aprenda com quem ja trilhou o caminho, na pratica",
        intro: "Conte o que voce ja sabe, o que quer aprender e quando pode estudar. A Ponte calcula a compatibilidade com cada mentor e explica o porque.",
        features: [
          { title: "Busca de mentores por compatibilidade", description: "Filtre por ferramentas, tipo de projeto, tipo de ajuda, disponibilidade, experiencia e modalidade." },
          { title: "Pedido de mentoria com objetivo", description: "Explique o que voce quer aprender; o mentor recebe uma notificacao." },
          { title: "Projetos particulares privados", description: "Crie projetos de portfolio visiveis so para voce e para os mentores que autorizar. Revogue quando quiser." },
          { title: "Participacao em projetos", description: "Candidate-se a projetos open source, educacionais e de empresas." },
          { title: "Metas e etapas", description: "Defina metas, marque etapas concluidas e receba feedback do mentor." },
          { title: "Eventos e certificados", description: "Inscreva-se em eventos, faca check-in e receba certificados verificaveis." },
        ],
        journey: ["Cadastro", "Busca", "Mentoria", "Projeto", "Aprendizado"],
        actions: [
          { href: "/mentores", label: "Encontrar mentores" },
          { href: "/perfil", label: "Editar perfil" },
          { href: "/projetos/novo", label: "Criar projeto" },
          { href: "/aprendizado", label: "Minhas metas" },
        ],
        publicLink: { href: "/mentores", label: "Ver mentores" },
      }}
    />
  );
}
