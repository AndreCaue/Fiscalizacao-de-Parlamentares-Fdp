"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Calendar, ChevronRight, Search, Filter, Users } from "lucide-react";
import { dropdownService, votacoesService } from "@/services/api";
import type { Votacao, PaginatedResponse } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function VotacoesPage() {
  const [resultado, setResultado] = useState<PaginatedResponse<Votacao> | null>(
    null,
  );
  const [listSiglas, setListSiglas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await votacoesService.listar({
        page,
        limit: 24,
        sigla_tipo: tipo || undefined,
      });
      setResultado(data);
    } finally {
      setLoading(false);
    }
  }, [page, tipo]);

  useEffect(() => {
    async function carregarDropdown() {
      const drop = await dropdownService.comissoes();
      setListSiglas(drop);
    }
    carregarDropdown();
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const votacoesFiltradas =
    resultado?.data.filter((v) =>
      busca ? v.descricao.toLowerCase().includes(busca.toLowerCase()) : true,
    ) ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Votações</h1>
        <p className="text-gray-400">
          Votações nominais da Câmara dos Deputados
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar votação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-gray-500 text-gray-200 placeholder:text-gray-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              setPage(1);
            }}
            className="bg-gray-900 border border-gray-700 rounded-lg text-sm px-3 py-2.5 focus:outline-none focus:border-gray-500 text-gray-200"
          >
            <option value="">Todas as comissões</option>

            {listSiglas.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse"
            >
              <div className="h-3 bg-gray-800 rounded mb-3 w-1/3" />
              <div className="h-4 bg-gray-800 rounded mb-2" />
              <div className="h-4 bg-gray-800 rounded w-2/3 mb-4" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : votacoesFiltradas.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">Nenhuma votação encontrada</p>
          <p className="text-sm mt-1">Sincronize os dados na página inicial</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {votacoesFiltradas.map((votacao) => (
            <Link
              key={votacao.id}
              href={`/votacoes/${votacao.id}`}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-800/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                  {votacao.siglaTipo || votacao.tipo}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0" />
              </div>
              <p className="text-sm font-medium text-gray-200 line-clamp-3 mb-4 leading-relaxed">
                {votacao.descricao}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(votacao.data), "d 'de' MMM 'de' yyyy", {
                  locale: ptBR,
                })}
                {votacao._count && (
                  <>
                    <span>·</span>
                    <Users className="w-3.5 h-3.5" />
                    {votacao._count.votos}
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {resultado && resultado.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg disabled:opacity-40 hover:border-gray-500 transition-colors"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-400 px-3">
            {page} / {resultado.meta.totalPages}
          </span>
          <button
            onClick={() =>
              setPage((p) => Math.min(resultado.meta.totalPages, p + 1))
            }
            disabled={page === resultado.meta.totalPages}
            className="px-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg disabled:opacity-40 hover:border-gray-500 transition-colors"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
