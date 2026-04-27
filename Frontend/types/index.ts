export interface Partido {
  id: string;
  sigla: string;
  nome: string;
  _count?: { deputados: number };
}

export interface Deputado {
  id: string;
  nome: string;
  estado: string;
  urlFoto?: string;
  url_foto?: string;
  email?: string;
  partidoId: string;
  partido_id?: string;
  partido: Partido;
  _count?: { votos: number };
}

export interface Votacao {
  id: string;
  descricao: string;
  data: string;
  tipo: string;
  siglaTipo?: string;
  _count?: { votos: number };
}

export interface Voto {
  id: string;
  deputadoId: string;
  votacaoId: string;
  voto: TipoVoto;
  cor: string;
  deputado: Deputado;
  votacao?: Votacao;
}

export type TipoVoto = "SIM" | "NAO" | "ABSTENCAO" | "OBSTRUCAO";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListResponse<T> {
  data: T[];
}

export interface ResumoVotacao {
  votacaoId: string;
  total: number;
  resultado: {
    tipo: TipoVoto;
    quantidade: number;
    percentual: number;
    cor: string;
  }[];
}

export interface VotoPorPartido {
  partido: Partido;
  votos: Record<TipoVoto, number>;
  votoMajoritario: TipoVoto;
  totalDeputados: number;
  deputados: {
    id: string;
    nome: string;
    voto: TipoVoto;
    cor: string;
    urlFoto?: string;
  }[];
}

export interface GrafoData {
  nodes: GrafoNode[];
  edges: GrafoEdge[];
  total: number;
}

export interface GrafoNode {
  id: string;
  type: "partido" | "deputado";
  data: {
    label: string;
    nome?: string;
    nomeCompleto?: string;
    count?: number;
    partido?: string;
    voto?: TipoVoto;
    cor?: string;
    estado?: string;
    urlFoto?: string;
    seguiuOrientacao?: boolean;
  };
  position: { x: number; y: number };
}

export interface GrafoEdge {
  id: string;
  source: string;
  target: string;
  style?: Record<string, any>;
}

export interface EstatisticasDeputado {
  total: number;
  porTipo: Record<TipoVoto, number>;
  percentuais: Record<TipoVoto, string>;
}

export interface SyncLog {
  id: string;
  tipo: string;
  status: "success" | "error" | "running";
  mensagem?: string;
  registros?: number;
  criadoEm: string;
}

export const LABEL_VOTO: Record<TipoVoto, string> = {
  SIM: "Sim",
  NAO: "Não",
  ABSTENCAO: "Abstenção",
  OBSTRUCAO: "Obstrução",
};

export const COR_VOTO: Record<TipoVoto, string> = {
  SIM: "#22c55e",
  NAO: "#ef4444",
  ABSTENCAO: "#3b82f6",
  OBSTRUCAO: "#f59e0b",
};

export const BG_VOTO: Record<TipoVoto, string> = {
  SIM: "bg-green-500",
  NAO: "bg-red-500",
  ABSTENCAO: "bg-blue-500",
  OBSTRUCAO: "bg-amber-500",
};

export const TEXT_VOTO: Record<TipoVoto, string> = {
  SIM: "text-green-600",
  NAO: "text-red-600",
  ABSTENCAO: "text-blue-600",
  OBSTRUCAO: "text-amber-600",
};

export interface OrientacaoBancada {
  id: string;
  votacaoId: string;
  siglaPartidoBloco: string;
  codPartidoBloco?: number;
  tipoLideranca: "P" | "B"; // P = partido, B = bloco
  orientacao: TipoOrientacao;
  cor: string;
}

export type TipoOrientacao =
  | "SIM"
  | "NAO"
  | "ABSTENCAO"
  | "OBSTRUCAO"
  | "LIBERADO"
  | "AUSENTE";

export const LABEL_ORIENTACAO: Record<TipoOrientacao, string> = {
  SIM: "Sim",
  NAO: "Não",
  ABSTENCAO: "Abstenção",
  OBSTRUCAO: "Obstrução",
  LIBERADO: "Liberado",
  AUSENTE: "Sem orientação",
};

export const COR_ORIENTACAO: Record<TipoOrientacao, string> = {
  SIM: "#22c55e",
  NAO: "#ef4444",
  ABSTENCAO: "#3b82f6",
  OBSTRUCAO: "#f59e0b",
  LIBERADO: "#9ca3af",
  AUSENTE: "#4b5563",
};
