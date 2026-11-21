import type { Metadata } from "next";
import { RoleLanding } from "@/components/role-landing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sou Mentor — Ponte" };

export default function SouMentorPage() {
  return (
    <RoleLanding
      config={{
        role: "mentor",
        eyebrow: "Sou Mentor",
        title: "Transforme sua experiencia em aprendizado para outras pessoas",
        intro: "Informe as ferramentas que domina, os tipos de ajuda que oferece e sua disponibilidade. A Ponte mostra voce para os mentorados mais compativeis.",
        features: [
          { title: "Perfil de mentor completo", description: "Ferramentas, areas, nivel de experiencia, tipos de ajuda, dias, periodos e modalidade." },
          { title: "Pedidos de mentoria com objetivo", description: "Cada pedido chega com o objetivo do mentorado. Voce aceita ou recusa no painel." },
          { title: "Projetos dos mentorados", description: "Acesse projetos particulares somente quando o mentorado autorizar, e deixe feedback." },
          { title: "Projetos educacionais e open source", description: "Publique projetos para a comunidade e avalie as candidaturas." },
          { title: "Acompanhamento de metas", description: "Veja metas e etapas dos seus mentorados e registre feedback sobre a evolucao." },
          { title: "Eventos e certificados", description: "Crie eventos online, presenciais ou hibridos, faca check-in e emita certificados." },
        ],
        journey: ["Cadastro", "Perfil e disponibilidade", "Pedidos de mentoria", "Projetos", "Feedback"],
        actions: [
          { href: "/perfil", label: "Editar perfil" },
          { href: "/dashboard", label: "Pedidos de mentoria" },
          { href: "/aprendizado", label: "Metas dos mentorados" },
          { href: "/projetos/novo", label: "Publicar projeto" },
        ],
        publicLink: { href: "/talentos", label: "Ver mentorados" },
      }}
    />
  );
}
