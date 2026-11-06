# Ponte

Comunidade aberta que conecta **profissionais experientes** (mentores e empresas)
a pessoas em **inicio de carreira ou transicao** — em qualquer idade.

## Funcionalidades (MVP)

- **Cadastro por convite + Google**: o administrador libera emails em `/admin`;
  novos usuarios entram via Google OAuth. Contas antigas seguem com email+senha.
- **Tres papeis**: mentor, mentorado e empresa (empresas tambem podem mentorar).
- **Rede de mentoria**: mentorados solicitam mentoria; mentores aceitam/recusam.
  Um mentorado pode ter varios mentores.
- **Contribuicoes publicas**: mentorados publicam projetos, PRs open source,
  palestras e eventos no perfil publico.
- **Recomendacoes**: mentores recomendam contribuicoes de mentorados da sua rede —
  evidencia real para o mercado.
- **Busca de talentos**: empresas (e qualquer visitante) buscam mentorados por
  habilidade, ordenados por recomendacoes.
- **Quadro de oportunidades**: mentores e empresas publicam vagas, eventos e
  projetos open source — inclusive para colaboracao entre mentores.
- **Eventos completos**: mentores e empresas criam eventos online, presenciais
  ou hibridos, com vagas, aprovacao manual, lista de espera, check-in e
  confirmacao voluntaria de chegada em casa.
- **Mentoria operavel**: mentorados registram disponibilidade; pares ativos
  agendam encontros; mentores podem cadastrar um mentorado com senha temporaria
  que deve ser trocada no primeiro acesso.
- **Certificados verificaveis**: organizadores emitem certificado para quem fez
  check-in, com uma pagina publica de validacao por codigo.
- **Privacidade por evento**: inscricao exige ciencia do aviso de privacidade;
  comunicacoes e uso de imagem sao consentimentos separados e opcionais.
- **Perfis publicos**: qualquer pessoa pode ver perfis, redes e contribuicoes.

## Como a plataforma funciona

### Perfis e responsabilidades

| Perfil | O que pode fazer |
| ------ | ---------------- |
| Administrador | Gerencia convites de mentor, mentorado e empresa em `/admin`. |
| Mentor | Aceita solicitacoes, cria mentorados manualmente, agenda mentorias, cria e opera eventos e emite certificados. |
| Mentorado | Mantem disponibilidade, pode ter varios mentores, solicita mentoria e pede acesso a eventos. |
| Empresa | Atua como organizadora/mentora, publica oportunidades e cria eventos. |

O relacionamento de mentoria e muitos-para-muitos: um mentorado pode estar
vinculado a varios mentores e participar de varios eventos.

### Eventos

Eventos podem ser **online**, **presenciais** ou **hibridos**. Ao criar um
evento, o organizador informa horario, vagas (opcional), se a aprovacao e
manual, link online e/ou endereco presencial.

- Eventos com vagas esgotadas encaminham novas solicitacoes para lista de espera.
- Organizadores aprovam ou recusam solicitacoes quando a aprovacao manual foi
  habilitada.
- O check-in e registrado pelo organizador no painel.
- Em encontros presenciais ou hibridos, o participante pode confirmar
  voluntariamente que chegou bem em casa. A plataforma nao rastreia sua
  localizacao.
- Certificados so podem ser emitidos para participantes com check-in e sao
  verificaveis publicamente por um codigo unico em `/certificados/<codigo>`.

### Mentoria e primeiro acesso

O mentor pode criar um mentorado manualmente no painel com nome, email e senha
temporaria. Essa senha deve ser enviada fora da plataforma por um canal seguro;
no primeiro login a pessoa e direcionada para definir sua propria senha antes
de acessar qualquer funcionalidade autenticada.

Mentorados informam faixas semanais de disponibilidade. Somente mentores com
vinculo de mentoria ativo podem usá-las para facilitar o agendamento de
encontros.

### Privacidade e seguranca

A inscricao em evento registra a ciencia do aviso de privacidade. Os
consentimentos para receber comunicacoes e para uso de imagem sao opcionais e
separados do aceite necessario para gerir a inscricao.

- Cada acao sensivel valida sessao, papel e propriedade do recurso no servidor.
- Senhas usam `scrypt`; sessoes usam cookies `httpOnly` com expiração.
- Acoes administrativas relevantes (eventos, presenca, certificados,
  disponibilidade e cadastro manual) sao registradas em auditoria.
- Os dados de eventos incluem apenas o necessario para inscricao, presenca e
  certificacao. Consulte `/privacidade` para os controles e finalidades
  comunicados ao participante.

## Stack

- Next.js (App Router) + React + Tailwind CSS
- SQLite via `node:sqlite` embutido no Node 24+ (zero dependencias nativas)
- Autenticacao propria: senha com scrypt + sessao por cookie httpOnly

## Rodando local

```bash
npm install
npm run dev
# http://localhost:3000
```

O banco `data/ponte.db` e criado e populado com dados de demo na primeira
execucao. Para comecar do zero, apague a pasta `data/`. Para desativar o
seed de demo (ex.: deploy real), use `SEED_DEMO=0`.

Para rodar em modo producao (`output: "standalone"`, mesmo do Dockerfile):

```bash
npm run build
npm start   # node .next/standalone/server.js em localhost:3000
```

## Admin e convites

A pagina `/admin` e protegida por credenciais definidas em `.env.local`
(nao commitado):

```bash
ADMIN_EMAIL=voce@exemplo.com
ADMIN_PASSWORD=sua-senha
GOOGLE_CLIENT_ID=...        # Google Cloud Console > Credentials
GOOGLE_CLIENT_SECRET=...
BASE_URL=http://localhost:3000
```

No `/admin` voce adiciona/remove emails convidados e define o papel de cada
um. O convidado entra em `/signup` > "Continuar com Google"; a conta e criada
automaticamente se o email estiver na lista.

Mentores tambem podem criar, no painel, um acesso de mentorado por nome,
email e senha temporaria. A senha deve ser enviada pelo mentor em canal seguro;
a plataforma exige que ela seja alterada no primeiro login.

Para criar as credenciais do Google: Cloud Console > APIs & Services >
Credentials > Create OAuth client ID > Web application, com redirect URI
`<BASE_URL>/auth/google/callback`.

### Contas de demo (senha: `senha123`)

| Papel      | Email              |
| ---------- | ------------------ |
| Mentor     | ana@ponte.dev      |
| Mentor     | carlos@ponte.dev   |
| Mentor     | rita@ponte.dev     |
| Empresa    | contato@techcorp.dev |
| Mentorado  | joao@email.com     |
| Mentorado  | maria@email.com    |
| Mentorado  | pedro@email.com    |

## Deploy (Docker — Railway, Render, Fly.io, VPS)

```bash
docker build -t ponte .
docker run -p 3000:3000 -v ponte-data:/app/data ponte
```

O volume `/app/data` persiste o SQLite. Para apontar o banco para outro
caminho, use a env `DATABASE_PATH`.

No Railway/Render: aponte para o Dockerfile e anexe um volume em `/app/data`.

## Nota sobre o `.npmrc`

O arquivo `.npmrc` aponta para `registry.npmmirror.com` porque o registry
oficial do npm nao estava acessivel na rede onde o projeto foi criado.
Se `registry.npmjs.org` funcionar na sua rede, voce pode remover o arquivo.
