# Ponte

Comunidade aberta que conecta **profissionais experientes** (mentores e empresas)
a pessoas em **inicio de carreira ou transicao** — em qualquer idade.

## Funcionalidades (MVP)

- **Novo:** tres acessos (Sou Mentor / Sou Mentorado / Sou Empresa), perfis detalhados
  (ferramentas, areas, tipos de ajuda, disponibilidade, modalidade e dados da empresa), busca
  de mentores e mentorados por compatibilidade explicavel, projetos particulares, open source,
  educacionais e empresariais (com candidaturas e privacidade), metas com etapas e feedback,
  notificacoes e filtros e detalhes de eventos. Veja "Jornada educacional" no roteiro de testes.

- **Cadastro com aprovacao**: mentores e mentorados solicitam acesso com nome,
  email e senha; o administrador aprova antes do primeiro login.
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
- **Perfil publico por aceite**: nome, resumo, bio, habilidades, rede e
  contribuicoes so aparecem publicamente quando a pessoa aceita essa
  visibilidade; o aceite pode ser revogado no painel.
- **Perfis publicos**: qualquer pessoa pode ver perfis, redes e contribuicoes.

## Como a plataforma funciona

### Perfis e responsabilidades

| Perfil | O que pode fazer |
| ------ | ---------------- |
| Administrador | Analisa e aprova cadastros de mentores e mentorados em `/admin`. |
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

O perfil publico tambem exige aceite expresso: somente nome, resumo, bio,
habilidades, rede e contribuicoes podem aparecer para visitantes. Email,
disponibilidade, presencas, anotacoes e consentimentos continuam privados. A
pessoa pode desativar a visibilidade no editor do proprio perfil.

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

No `/admin`, o administrador analisa os cadastros pendentes e aprova ou recusa
cada mentor e mentorado. Uma conta pendente nao consegue fazer login.

Os convites Google existentes permanecem como fluxo legado para contas que ja
usavam OAuth; o fluxo recomendado para novos participantes e o cadastro direto
com aprovacao administrativa.

Mentores tambem podem criar, no painel, um acesso de mentorado por nome,
email e senha temporaria. A senha deve ser enviada pelo mentor em canal seguro;
a plataforma exige que ela seja alterada no primeiro login.

Para criar as credenciais do Google: Cloud Console > APIs & Services >
Credentials > Create OAuth client ID > Web application, com redirect URI
`<BASE_URL>/auth/google/callback`.

## Seguranca, amigos e administracao

### Quem deve usar cada acesso

- **Amigos e participantes:** devem solicitar uma conta individual como mentor
  ou mentorado e aguardar aprovacao. Um mentor tambem pode cadastrar um
  mentorado com senha temporaria; mesmo assim, o administrador precisa aprovar
  a conta. Nunca compartilhe contas demo nem a senha de administrador.
- **Mentores e empresas:** usam suas contas individuais para operar mentorias e
  eventos.
- **Administrador:** usa exclusivamente `/admin` para aprovar ou recusar
  cadastros. Esse acesso e para o responsavel pela plataforma, nao para
  participantes.

### Configurar o login administrativo

O login de administrador ja esta implementado e continua usando as variaveis
privadas abaixo. Defina valores fortes em `.env.local` no desenvolvimento e no
painel da Vercel em producao:

```bash
ADMIN_EMAIL=admin@seudominio.com
ADMIN_PASSWORD=uma-senha-longa-unica-e-privada
```

Depois, entre em `/admin` com esse email e essa senha. **Nao coloque os valores
reais no README, no Git, em mensagens de grupo ou no site publico.** Na Vercel,
as variaveis de ambiente ficam protegidas no projeto e devem ser configuradas
para Preview e Production.

### Como liberar amigos para testar

1. Entre como mentor no painel.
2. Em **Adicionar mentorado**, informe nome, email e uma senha temporaria de
   pelo menos dez caracteres.
3. Envie essa senha somente para a pessoa correspondente, em mensagem privada.
4. No `/admin`, aprove o cadastro em **Cadastros aguardando aprovacao**.
5. No primeiro acesso, ela cria a propria senha e aceita as condicoes de
   participacao, o Codigo de Conduta e, se quiser, a autorizacao de imagem.
6. A pessoa ja pode informar disponibilidade, solicitar eventos e participar de
   mentorias.

### Publicar na Vercel com seguranca

> **Antes de publicar para amigos:** o banco SQLite atual e adequado para o
> ambiente local, mas deve ser migrado para PostgreSQL gerenciado antes de usar
> a Vercel em producao. Arquivos locais nao sao uma base persistente confiavel
> para uma aplicacao serverless.

1. Crie um PostgreSQL gerenciado — Neon e a opcao recomendada pela integracao
   da Vercel.
2. Migre o codigo do banco de SQLite para PostgreSQL e configure `DATABASE_URL`.
3. Importe o repositorio na Vercel.
4. Em **Settings → Environment Variables**, cadastre `DATABASE_URL`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET` e `BASE_URL`.
5. Configure `BASE_URL` com o dominio final, por exemplo
   `https://ponte.vercel.app`.
6. No Google Cloud, adicione
   `https://ponte.vercel.app/auth/google/callback` como URI de redirecionamento.
7. Faça primeiro um deploy Preview, execute o roteiro de testes deste README e
   so depois publique em Production.

As acoes de cadastro, eventos, presenca e certificados validam usuario, papel
e propriedade no servidor. Senhas sao protegidas com `scrypt`, sessoes usam
cookies `httpOnly`, e acoes operacionais relevantes entram no log de auditoria.

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

## Roteiro de testes ponta a ponta

Com o servidor em execucao (`npm run dev`), abra uma janela normal e uma janela
anonima em `http://localhost:3000`. Use as contas de demo acima para validar o
fluxo completo sem depender do Google OAuth.

### 1. Criar e operar um evento

1. Entre como `ana@ponte.dev` (mentor) e abra o painel.
2. Crie um evento **hibrido** ou **presencial**, com data futura, uma vaga e a
   opcao de aprovacao manual marcada.
3. Na janela anonima, entre como `joao@email.com` e abra **Eventos**.
4. Solicite acesso ao evento, aceitando o aviso de privacidade. Marque os
   consentimentos de comunicacao e imagem apenas se desejar testar esses campos
   opcionais.
5. Volte para a Ana, aprove a solicitacao e registre o check-in do Joao.
6. Emita o certificado. A pagina aberta em `/certificados/<codigo>` deve exibir
   o participante, evento, emissor e codigo de verificacao.
7. Volte ao Joao: em **Minhas inscricoes**, a opcao **Cheguei bem em casa**
   deve aparecer para eventos presenciais/hibridos com check-in.

Para testar lista de espera, mantenha o evento com uma vaga ocupada e solicite
acesso tambem como `maria@email.com` ou `pedro@email.com`.

### Emitir um certificado manualmente

O certificado e emitido pelo organizador/mentor a partir do check-in do
participante. O processo nao exige preencher nome ou carga horaria novamente:
a plataforma usa os dados do evento e da inscricao para reduzir erros.

1. Entre com a conta do **mentor ou empresa que criou o evento**.
2. Abra o **Painel** (`/dashboard`) e localize a secao **Meus eventos**.
3. Encontre o evento e, na lista de participantes, confirme que a pessoa esta
   com a inscricao **confirmada**.
4. Clique em **check-in** quando a pessoa estiver presente. Sem check-in, o
   botao de certificado nao aparece.
5. Depois do check-in, clique em **emitir certificado** ao lado do nome da
   pessoa.
6. A plataforma abre a pagina publica do certificado em
   `/certificados/<codigo>`. Ela mostra participante, evento, emissor, data e
   o codigo unico de verificacao.
7. Copie a URL exibida e compartilhe-a com o participante. Ela serve como
   comprovacao verificavel; qualquer pessoa com o link pode consultar o
   certificado, sem precisar entrar na plataforma.

Regras importantes:

- Apenas quem criou o evento pode registrar presenca ou emitir certificados.
- Cada participante recebe apenas um certificado por evento. Uma segunda
  tentativa e bloqueada para evitar duplicidade.
- O certificado so pode ser emitido depois de uma presenca confirmada.
- Para eventos presenciais/hibridos, a confirmacao de chegada em casa e
  independente e voluntaria; ela nao interfere na emissao do certificado.

### 2. Mentoria e disponibilidade

1. Com Joao logado, adicione uma ou mais faixas em **Minha disponibilidade**.
2. Com Ana logada, use **Agendar encontro de mentoria** para um mentorado ativo.
3. Confirme que ambos os usuarios veem suas conexoes e que o encontro e salvo.

### 3. Cadastro manual de mentorado

1. Com Ana logada, use **Adicionar mentorado** e informe nome, email de teste e
   senha temporaria com pelo menos dez caracteres.
2. Saia e entre com o novo email e a senha temporaria.
3. A plataforma deve direcionar para `/primeiro-acesso`; o painel so fica
   disponivel depois que a senha pessoal e definida.

> O cadastro manual persiste no SQLite. Use um email descartavel durante o
> teste ou execute a aplicacao com um `DATABASE_PATH` de teste separado.

### 4. Administracao

Com as variaveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` configuradas, acesse
`/admin`, aprove um cadastro de mentor ou mentorado e confirme que ele consegue
entrar com o email e senha escolhidos no registro.

### 5. Jornada educacional (HackBrasil — Acesso a Educacao)

Jornada principal: **Cadastro → Busca → Mentoria → Projeto → Aprendizado**.

1. Na pagina inicial, escolha **Sou Mentor**, **Sou Mentorado** ou **Sou Empresa**
   (`/sou-mentor`, `/sou-mentorado`, `/sou-empresa`).
2. Entre como `joao@email.com` e abra `/mentores`: os filtros ja vem preenchidos com
   as ferramentas que ele quer aprender e a disponibilidade dele. Cada mentor mostra a
   porcentagem de compatibilidade, os motivos, as diferencas e o calculo por criterio.
3. Solicite mentoria informando o objetivo. O mentor recebe uma notificacao (sino no topo).
4. Entre como `maria@email.com` e abra `/projetos/1` (projeto particular). Somente ela e
   o mentor autorizado (Carlos) veem esse projeto. Clique em **Remover acesso**: Carlos
   deixa de ver na hora. Empresas e outros mentorados recebem 404.
5. Em `/aprendizado`, Maria marca etapas da meta; Carlos ve a meta e deixa feedback.
6. Entre como `contato@techcorp.dev`, abra `/projetos/3` e clique em
   **Buscar mentorados compativeis**: `/talentos` usa as ferramentas e areas do projeto.
   A candidatura do Pedro pode ser aceita ou recusada no proprio projeto.
7. `/eventos` tem filtros por modalidade, categoria e cidade, e cada evento tem uma pagina
   de detalhes (`/eventos/[id]`). A inscricao, a aprovacao, a lista de espera, o check-in e
   os certificados continuam iguais.

**Calculo de compatibilidade** (`src/lib/matching.ts`, deterministico e sem IA):

| Mentorado procurando mentor | Peso | Empresa/mentor procurando mentorado | Peso |
| --- | --- | --- | --- |
| Ferramentas | 30% | Ferramentas (conhece = 1, quer aprender = 0,5) | 30% |
| Tipo de projeto | 20% | Tipo de projeto | 25% |
| Tipo de ajuda | 20% | Nivel de experiencia | 15% |
| Disponibilidade | 15% | Objetivos de aprendizado | 15% |
| Experiencia do mentor | 10% | Disponibilidade | 10% |
| Modalidade | 5% | Modalidade | 5% |

Criterios que nao foram preenchidos nao entram na conta: o peso deles e redistribuido.
Os filtros "Obrigatorio" excluem quem nao atende ao criterio. Empates sao desempatados
por ferramentas, depois disponibilidade, depois perfil mais completo e, por fim, nome.

**Privacidade de projetos** (`canViewProject` em `src/lib/matching.ts`, aplicado no servidor por
`src/lib/projects.ts`): projetos particulares sao sempre privados, nao aparecem em buscas e
so podem ser vistos pelo dono e pelos mentores com acesso ativo. So e possivel dar acesso a
mentores com mentoria ativa. Quem nao tem permissao recebe a mesma resposta 404 de um projeto
inexistente.

### Checklist tecnico

```bash
npm run lint
npm run typecheck
npm test        # testes de compatibilidade, privacidade, projetos, eventos, perfis e senha
npm run build
```

Todos os comandos devem concluir sem erros. Em seguida, confirme que
`http://localhost:3000/eventos` responde e apresenta a agenda de eventos.

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
