"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, BarChart3 } from "lucide-react";
import { deputadosService } from "@/services/api";
import type { Deputado, Voto, EstatisticasDeputado, TipoVoto } from "@/types";
import { LABEL_VOTO, COR_VOTO, BG_VOTO } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DeputadoPage() {
  const { id } = useParams<{ id: string }>();
  const [deputado, setDeputado] = useState<Deputado | null>(null);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [stats, setStats] = useState<EstatisticasDeputado | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [dep, vots, estatisticas] = await Promise.all([
        deputadosService.buscar(id),
        deputadosService.votos(id, { page, limit: 20 }),
        deputadosService.estatisticas(id),
      ]);
      setDeputado(dep);
      setVotos(vots.data);
      setTotalPages(vots.meta.totalPages);
      setStats(estatisticas);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loading) return <LoadingSkeleton />;
  if (!deputado)
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-gray-500">
        Deputado não encontrado.
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <Link
        href="/deputados"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para deputados
      </Link>

      {/* Profile card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row gap-6 items-start">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-700 flex-shrink-0">
          {deputado?.url_foto ? (
            <Image
              src={deputado.url_foto || ""}
              alt={deputado.nome}
              width={96}
              height={96}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-2xl font-bold text-gray-500">
              {deputado.nome[0]}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-100 mb-1">
            {deputado.nome}
          </h1>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-brasil-azul/20 border border-brasil-azul/30 text-brasil-azul text-xs font-medium">
              {deputado.partido?.sigla ?? deputado.partidoId}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs">
              {deputado.partido?.nome}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs">
              {deputado.estado}
            </span>
          </div>
          {deputado.email && (
            <p className="text-xs text-gray-500">{deputado.email}</p>
          )}
        </div>
      </div>

      {/* Estatísticas de votação */}
      {stats && stats.total > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Perfil de votação
          </h2>

          {/* Barra visual */}
          <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
            {(Object.entries(stats.porTipo) as [TipoVoto, number][])
              .sort(([, a], [, b]) => b - a)
              .map(([tipo, qtd]) => (
                <div
                  key={tipo}
                  style={{
                    width: `${(qtd / stats.total) * 100}%`,
                    backgroundColor: COR_VOTO[tipo],
                  }}
                  title={`${LABEL_VOTO[tipo]}: ${qtd}`}
                />
              ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.entries(stats.porTipo) as [TipoVoto, number][]).map(
              ([tipo, qtd]) => (
                <div key={tipo} className="text-center">
                  <p
                    className="text-xl font-bold"
                    style={{ color: COR_VOTO[tipo] }}
                  >
                    {qtd}
                  </p>
                  <p className="text-xs text-gray-400">{LABEL_VOTO[tipo]}</p>
                  <p className="text-xs text-gray-600">
                    {stats.percentuais[tipo]}%
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Histórico de votos */}
      <div>
        <h2 className="text-lg font-bold mb-4">
          Histórico de votações
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({stats?.total ?? 0} votos)
          </span>
        </h2>

        {votos.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
            Nenhum voto registrado para este deputado.
          </div>
        ) : (
          <div className="space-y-2">
            {votos.map((voto) => (
              <Link
                key={voto.id}
                href={`/votacoes/${voto.votacaoId}`}
                className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 hover:border-gray-600 transition-all group"
              >
                {/* Indicador visual do voto */}
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      COR_VOTO[voto.voto as TipoVoto] || "#6b7280",
                  }}
                />

                {/* Descrição da votação */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 line-clamp-1 group-hover:text-white transition-colors">
                    {voto.votacao?.descricao ?? `Votação ${voto.votacaoId}`}
                  </p>
                  {voto.votacao?.data && (
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(voto.votacao.data), "d MMM yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  )}
                </div>

                {/* Badge do voto */}
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${BG_VOTO[voto.voto as TipoVoto] ?? "bg-gray-700"} bg-opacity-20 text-white`}
                  style={{
                    backgroundColor: `${COR_VOTO[voto.voto as TipoVoto]}25`,
                    color: COR_VOTO[voto.voto as TipoVoto],
                  }}
                >
                  {LABEL_VOTO[voto.voto as TipoVoto] ?? voto.voto}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
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
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-32 mb-6" />
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 flex gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gray-800" />
        <div className="flex-1">
          <div className="h-6 bg-gray-800 rounded w-1/2 mb-3" />
          <div className="flex gap-2">
            <div className="h-6 bg-gray-800 rounded-full w-16" />
            <div className="h-6 bg-gray-800 rounded-full w-24" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-16 bg-gray-900 border border-gray-800 rounded-xl"
          />
        ))}
      </div>
    </div>
  );
}
