"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Users, ChevronRight } from "lucide-react";
import { deputadosService, partidosService } from "@/services/api";
import type { Deputado, Partido } from "@/types";

export default function DeputadosPage() {
  const [deputados, setDeputados] = useState<Deputado[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [partidoFiltro, setPartidoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const ESTADOS = [
    "AC",
    "AL",
    "AM",
    "AP",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MG",
    "MS",
    "MT",
    "PA",
    "PB",
    "PE",
    "PI",
    "PR",
    "RJ",
    "RN",
    "RO",
    "RR",
    "RS",
    "SC",
    "SE",
    "SP",
    "TO",
  ];

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await deputadosService.listar({
        page,
        limit: 30,
        partido: partidoFiltro || undefined,
        estado: estadoFiltro || undefined,
      });
      setDeputados(res.data);
      setTotalPages(res.meta.totalPages);
      setTotal(res.meta.total);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [page, partidoFiltro, estadoFiltro]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    partidosService
      .listar()
      .then((r) => setPartidos(r.data))
      .catch(() => {});
  }, []);

  // Filtra por nome localmente (busca)
  const deputadosFiltrados = busca
    ? deputados.filter((d) =>
        d.nome.toLowerCase().includes(busca.toLowerCase()),
      )
    : deputados;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Deputados <span className="text-brasil-amarelo">Federais</span>
        </h1>
        <p className="text-gray-400 text-sm">
          {total > 0
            ? `${total} deputados na base de dados`
            : "Sincronize os dados para ver os deputados"}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Busca por nome */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-gray-500 transition"
          />
        </div>

        {/* Partido */}
        <select
          value={partidoFiltro}
          onChange={(e) => {
            setPartidoFiltro(e.target.value);
            setPage(1);
          }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-gray-500 transition"
        >
          <option value="">Todos os partidos</option>
          {partidos.map((p) => (
            <option key={p.id} value={p.sigla}>
              {p.sigla} — {p.nome}
            </option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={estadoFiltro}
          onChange={(e) => {
            setEstadoFiltro(e.target.value);
            setPage(1);
          }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-gray-500 transition"
        >
          <option value="">Todos os estados</option>
          {ESTADOS.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20 animate-pulse"
            />
          ))}
        </div>
      ) : deputadosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum deputado encontrado.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deputadosFiltrados.map((dep) => (
              <Link
                key={dep.id}
                href={`/deputados/${dep.id}`}
                className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-600 hover:bg-gray-800/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-700 flex-shrink-0">
                  {dep.urlFoto ? (
                    <Image
                      src={dep.urlFoto}
                      alt={dep.nome}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-sm text-gray-500 font-medium">
                      {dep.nome[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    {dep.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dep.partido?.sigla ?? dep.partidoId} · {dep.estado}
                  </p>
                  {dep._count && (
                    <p className="text-xs text-gray-600">
                      {dep._count.votos} votos
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg disabled:opacity-40 hover:border-gray-500 transition"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-400">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm bg-gray-900 border border-gray-700 rounded-lg disabled:opacity-40 hover:border-gray-500 transition"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
