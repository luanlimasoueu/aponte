export const TOOLS = [
  "Python", "SQL", "Excel", "Power BI", "Tableau", "JavaScript", "TypeScript", "React",
  "Node.js", "Java", "C#", "Git e GitHub", "HTML e CSS", "Machine Learning",
  "Inteligencia Artificial", "Ciencia de Dados", "UX/UI", "Figma", "Docker", "Cloud Computing",
];
export const NO_TOOLS = "Ainda nao conheco nenhuma";

export const WEEKDAYS = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"];
export const PERIODS = ["Manha", "Tarde", "Noite", "Flexivel"];
export const SESSION_DURATIONS = ["30 minutos", "1 hora", "2 horas", "3 horas", "4 horas ou mais"];
export const WEEKLY_HOURS = ["1 a 2 horas", "3 a 5 horas", "6 a 10 horas", "Mais de 10 horas"];
export const MODALITIES = ["Online", "Presencial", "Ambas"];

export const MENTOR_LEVELS = [
  "Estudante com conhecimentos na area", "Profissional junior", "Profissional pleno",
  "Profissional senior", "Especialista", "Professor ou educador", "Outro",
];
export const MENTEE_LEVELS = [
  "Nunca trabalhei com tecnologia", "Iniciante, comecando a estudar", "Estudante de curso tecnico",
  "Estudante universitario", "Em transicao de carreira", "Profissional junior",
  "Profissional pleno", "Profissional senior", "Outro",
];

export const HELP_TYPES = [
  "Tirar duvidas sobre ferramentas", "Tirar duvidas sobre projetos", "Planejar projetos",
  "Desenvolver projetos dos mentorados", "Resolver problemas tecnicos", "Apoiar open source",
  "Revisar codigo", "Carreira e portfolio", "Preparar para entrevistas", "Aprender novas ferramentas",
];

export const AREAS = [
  "Analise de Dados", "Ciencia de Dados", "Inteligencia Artificial", "Machine Learning",
  "Desenvolvimento Web", "Desenvolvimento Mobile", "Automacao", "UX/UI", "Engenharia de Dados",
  "Desenvolvimento de Jogos", "Seguranca da Informacao", "Cloud Computing",
];

export const COMPANY_TYPES = [
  "Startup", "Microempresa", "Pequena empresa", "Media empresa", "Grande empresa",
  "Empresa de tecnologia", "Consultoria", "Instituicao de ensino", "Organizacao sem fins lucrativos", "Outro",
];
export const SECTORS = [
  "Tecnologia", "Educacao", "Saude", "Financas", "Industria", "Comercio", "Servicos",
  "Marketing", "Logistica", "Agronegocio", "Outros",
];

export const PROJECT_KINDS = {
  particular: "Projeto particular",
  open_source: "Projeto open source",
  educacional: "Projeto educacional",
  empresarial: "Projeto empresarial",
} as const;
export type ProjectKind = keyof typeof PROJECT_KINDS;

export const PROJECT_STATUS = {
  rascunho: "Rascunho",
  aberto: "Aberto para participacao",
  andamento: "Em andamento",
  pausado: "Pausado",
  concluido: "Concluido",
  arquivado: "Arquivado",
} as const;

export const DIFFICULTIES = ["Iniciante", "Intermediario", "Avancado"];
export const OPPORTUNITY_TYPES = ["Educacional", "Colaborativo", "Open source", "Voluntario", "Estagio", "Remunerado"];

export const EVENT_CATEGORIES = [
  "Workshop", "Palestra", "Meetup", "Hackathon", "Curso", "Oficina pratica", "Networking",
  "Mentoria em grupo", "Apresentacao de projetos", "Evento open source", "Feira de tecnologia", "Outros",
];

export const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];
