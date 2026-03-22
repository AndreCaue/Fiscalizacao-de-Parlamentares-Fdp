"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Users,
  ArrowLeft,
  Network,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { votacoesService, integracaoService } from "@/services/api";
import type { Votacao, Voto, ResumoVotacao, TipoVoto } from "@/types";
import { LABEL_VOTO, COR_VOTO } from "@/types";
import { format } from "date-fns";
import OrientacoesBancada from "@/components/votacao/OrientacoesBancada";
import type { OrientacaoBancada } from "@/types";
import { ptBR } from "date-fns/locale";

const BADGE_CLASS: Record<TipoVoto, string> = {
  SIM: "bg-green-500/15 text-green-400 border-green-500/30",
  NAO: "bg-red-500/15 text-red-400 border-red-500/30",
  ABSTENCAO: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  OBSTRUCAO: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function VotacaoPage() {
  const { id } = useParams<{ id: string }>();
  const [votacao, setVotacao] = useState<
    (Votacao & { orientacoes?: OrientacaoBancada[] }) | null
  >(null);
  const [votos, setVotos] = useState<Voto[]>([]);
  const [resumo, setResumo] = useState<ResumoVotacao | null>(null);
  const [orientacoes, setOrientacoes] = useState<OrientacaoBancada[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filtro, setFiltro] = useState<TipoVoto | "TODOS">("TODOS");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [v, r, vots] = await Promise.all([
        votacoesService.buscar(id),
        votacoesService.resumo(id),
        votacoesService.votos(id, { page, limit: 60 }),
      ]);
      setVotacao(v);
      setResumo(r);
      setVotos(vots.data);
      setTotalPages(vots.meta.totalPages);
      if ((v as any).orientacoes) setOrientacoes((v as any).orientacoes);
    } catch {
      // empty
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function sincronizarVotos() {
    setSyncing(true);
    try {
      await integracaoService.syncVotos(id);
      await carregar();
    } finally {
      setSyncing(false);
    }
  }

  const votosFiltrados =
    filtro === "TODOS" ? votos : votos.filter((v) => v.voto === filtro);

  if (loading) return <LoadingSkeleton />;
  if (!votacao)
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-gray-500">
        Votação não encontrada.
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Back */}
      <Link
        href="/votacoes"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para votações
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
            {votacao.siglaTipo || votacao.tipo}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
            {votacao.tipo}
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-100 mb-4 leading-relaxed">
          {votacao.descricao}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {format(new Date(votacao.data), "d 'de' MMMM 'de' yyyy, HH:mm", {
              locale: ptBR,
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {votacao._count?.votos ?? 0} votos registrados
          </span>
          <Link
            href={`/grafo?votacaoId=${votacao.id}`}
            className="flex items-center gap-1.5 text-brasil-amarelo hover:underline"
          >
            <Network className="w-4 h-4" /> Ver grafo
          </Link>
        </div>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {resumo.resultado.map((r) => (
            <div
              key={r.tipo}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center"
              style={{ borderTopColor: r.cor, borderTopWidth: 3 }}
            >
              <p className="text-2xl font-bold" style={{ color: r.cor }}>
                {r.quantidade}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {LABEL_VOTO[r.tipo as TipoVoto]}
              </p>
              <p className="text-xs text-gray-600">{r.percentual}%</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de resultado visual */}
      {resumo && resumo.total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-6 gap-0.5">
          {resumo.resultado.map((r) => (
            <div
              key={r.tipo}
              style={{
                width: `${r.percentual}%`,
                backgroundColor: r.cor,
              }}
              title={`${LABEL_VOTO[r.tipo as TipoVoto]}: ${r.quantidade} (${r.percentual}%)`}
            />
          ))}
        </div>
      )}

      {/* Orientações de bancada */}
      <OrientacoesBancada orientacoes={orientacoes} />

      {/* Filtros + Sync */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {(["TODOS", "SIM", "NAO", "ABSTENCAO", "OBSTRUCAO"] as const).map(
            (tipo) => (
              <button
                key={tipo}
                onClick={() => setFiltro(tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filtro === tipo
                    ? tipo === "TODOS"
                      ? "bg-gray-700 border-gray-500 text-white"
                      : `border text-white ${BADGE_CLASS[tipo as TipoVoto]}`
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {tipo === "TODOS" ? "Todos" : LABEL_VOTO[tipo as TipoVoto]}
              </button>
            ),
          )}
        </div>
        <button
          onClick={sincronizarVotos}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-600 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Atualizando..." : "Atualizar votos"}
        </button>
      </div>

      {/* Grid de deputados */}
      {votosFiltrados.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhum voto encontrado.</p>
          <button
            onClick={sincronizarVotos}
            className="mt-3 text-brasil-amarelo text-sm hover:underline"
          >
            Carregar votos desta votação
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {votosFiltrados.map((voto) => (
              <DeputadoVotoCard key={voto.id} voto={voto} />
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

function DeputadoVotoCard({
  voto,
}: {
  voto: Voto & { seguiuOrientacao?: boolean | null };
}) {
  const cor = COR_VOTO[voto.voto as TipoVoto] || "#6b7280";
  const badgeClass =
    BADGE_CLASS[voto.voto as TipoVoto] ||
    "bg-gray-800 text-gray-400 border-gray-700";

  return (
    <Link
      href={`/deputados/${voto.deputadoId}`}
      className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-600 transition-all group"
    >
      {/* Foto */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full overflow-hidden border-2"
          style={{ borderColor: cor }}
        >
          {voto.deputado?.urlFoto ? (
            <Image
              src={voto.deputado.urlFoto}
              alt={voto.deputado.nome}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
              {voto.deputado?.nome?.[0] ?? "?"}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors">
          {voto.deputado?.nome ?? "—"}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {voto.deputado?.partido?.sigla} · {voto.deputado?.estado}
        </p>
      </div>

      {/* Badge voto + indicador de disciplina */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span
          className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}
        >
          {LABEL_VOTO[voto.voto as TipoVoto] ?? voto.voto}
        </span>
        {voto.seguiuOrientacao === true && (
          <span className="text-[10px] text-green-500 font-medium">
            ✓ seguiu
          </span>
        )}
        {voto.seguiuOrientacao === false && (
          <span className="text-[10px] text-red-400 font-medium">
            ✗ divergiu
          </span>
        )}
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-4 bg-gray-800 rounded w-32 mb-6" />
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <div className="h-6 bg-gray-800 rounded w-3/4 mb-4" />
        <div className="h-4 bg-gray-800 rounded w-1/2" />
      </div>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-20"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3 h-16"
          />
        ))}
      </div>
    </div>
  );
}
