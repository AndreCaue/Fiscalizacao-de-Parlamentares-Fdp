import axios from "axios";
import type {
  Deputado,
  Partido,
  Votacao,
  Voto,
  PaginatedResponse,
  ListResponse,
  ResumoVotacao,
  VotoPorPartido,
  GrafoData,
  EstatisticasDeputado,
  SyncLog,
} from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err);
  },
);

export const votacoesService = {
  listar: (params?: {
    page?: number;
    limit?: number;
    sigla_tipo?: string;
    dataInicio?: string;
    dataFim?: string;
  }) =>
    api
      .get<PaginatedResponse<Votacao>>("/votacoes", { params })
      .then((r) => r.data),

  recentes: (limit = 10) =>
    api
      .get<ListResponse<Votacao>>("/votacoes/recentes", { params: { limit } })
      .then((r) => r.data),

  buscar: (id: string) =>
    api.get<Votacao>(`/votacoes/${id}`).then((r) => r.data),

  votos: (
    id: string,
    params?: { page?: number; limit?: number; voto?: string },
  ) =>
    api
      .get<PaginatedResponse<Voto>>(`/votacoes/${id}/votos`, { params })
      .then((r) => r.data),

  resumo: (id: string) =>
    api.get<ResumoVotacao>(`/votacoes/${id}/`).then((r) => r.data),

  grafo: (id: string) =>
    api.get<GrafoData>(`/votacoes/${id}/grafo`).then((r) => r.data),
};

export const deputadosService = {
  listar: (params?: {
    page?: number;
    limit?: number;
    partido?: string;
    estado?: string;
  }) =>
    api
      .get<PaginatedResponse<Deputado>>("/deputados", { params })
      .then((r) => r.data),

  buscar: (id: string) =>
    api.get<Deputado>(`/deputados/${id}`).then((r) => r.data),

  votos: (id: string, params?: { page?: number; limit?: number }) =>
    api
      .get<PaginatedResponse<Voto>>(`/deputados/${id}/votos`, { params })
      .then((r) => r.data),

  estatisticas: (id: string) =>
    api
      .get<EstatisticasDeputado>(`/deputados/${id}/estatisticas`)
      .then((r) => r.data),
};

export const partidosService = {
  listar: () => api.get<Partido[]>("/partidos").then((r) => r.data),

  buscar: (id: string) =>
    api.get<Partido>(`/partidos/${id}`).then((r) => r.data),

  deputados: (id: string) =>
    api
      .get<ListResponse<Deputado>>(`/partidos/${id}/deputados`)
      .then((r) => r.data),
};

export const votosService = {
  porPartido: (votacaoId: string) =>
    api
      .get<{
        data: VotoPorPartido[];
      }>("/votos/por-partido", { params: { votacaoId } })
      .then((r) => r.data),

  divergentes: (votacaoId: string) =>
    api
      .get("/votos/divergencia", { params: { votacaoId } })
      .then((r) => r.data),
};

export const integracaoService = {
  syncCompleto: (dataInicio?: string) =>
    api
      .post("/integracao/sync/completo", null, { params: { dataInicio } })
      .then((r) => r.data),

  syncPartidos: () => api.post("/integracao/sync/partidos").then((r) => r.data),

  syncDeputados: () =>
    api.post("/integracao/sync/deputados").then((r) => r.data),

  syncVotacoes: (dataInicio?: string, dataFim?: string) =>
    api
      .post("/integracao/sync/votacoes", null, {
        params: { dataInicio, dataFim },
      })
      .then((r) => r.data),

  syncVotos: (votacaoId: string) =>
    api.post(`/integracao/sync/votos/${votacaoId}`).then((r) => r.data),

  logs: (limit = 20) =>
    api
      .get<SyncLog[]>("/integracao/logs", { params: { limit } })
      .then((r) => r.data),

  status: () => api.get("/integracao/status").then((r) => r.data),
};

export default api;

export const statsService = {
  resumo: () => api.get("/stats/resumo").then((r) => r.data),

  distribuicaoVotos: () =>
    api.get("/stats/distribuicao-votos").then((r) => r.data),

  disciplinaPartidos: (limit = 20) =>
    api
      .get("/stats/disciplina-partidos", { params: { limit } })
      .then((r) => r.data),

  deputadosDestaque: (limit = 10) =>
    api
      .get("/stats/deputados-destaque", { params: { limit } })
      .then((r) => r.data),

  votacoesDestaque: (limit = 5) =>
    api
      .get("/stats/votacoes-destaque", { params: { limit } })
      .then((r) => r.data),

  busca: (q: string, limit = 5) =>
    api
      .get("/stats/busca", { params: { nome: q, query: q, limit } })
      .then((r) => r.data),
};

export const dropdownService = {
  comissoes: () =>
    api.get("/api/v1/lookups/tipos-comissoes").then((r) => r.data),
};
