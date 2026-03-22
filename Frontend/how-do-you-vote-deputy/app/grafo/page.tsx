"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Network,
  ArrowLeft,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
} from "lucide-react";
import { votacoesService, integracaoService } from "@/services/api";
import type { Votacao, GrafoData, TipoVoto } from "@/types";
import { LABEL_VOTO, COR_VOTO } from "@/types";
import dynamic from "next/dynamic";

// React Flow só roda no cliente
const GrafoCanvas = dynamic(() => import("@/components/grafo/GrafoCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <Network className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
        <p className="text-sm">Carregando grafo...</p>
      </div>
    </div>
  ),
});

export default function GrafoPage() {
  const searchParams = useSearchParams();
  const votacaoIdParam = searchParams.get("votacaoId");

  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [votacaoSelecionada, setVotacaoSelecionada] = useState<string>(
    votacaoIdParam || "",
  );
  const [grafoData, setGrafoData] = useState<GrafoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega lista de votações para o select
  useEffect(() => {
    votacoesService
      .listar({ limit: 50 })
      .then((r) => setVotacoes(r.data))
      .catch(() => {});
  }, []);

  // Carrega grafo quando votação muda
  const carregarGrafo = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setErro("");
    try {
      const data = await votacoesService.grafo(id);
      setGrafoData(data);
      if (data.total === 0) {
        setErro("Esta votação ainda não tem votos sincronizados.");
      }
    } catch {
      setErro("Erro ao carregar o grafo. Tente sincronizar os votos primeiro.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (votacaoSelecionada) carregarGrafo(votacaoSelecionada);
  }, [votacaoSelecionada, carregarGrafo]);

  async function sincronizarVotos() {
    if (!votacaoSelecionada) return;
    setSyncing(true);
    try {
      await integracaoService.syncVotos(votacaoSelecionada);
      await carregarGrafo(votacaoSelecionada);
    } catch {
      setErro("Erro ao sincronizar votos.");
    } finally {
      setSyncing(false);
    }
  }

  const votacaoAtual = votacoes.find((v) => v.id === votacaoSelecionada);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Toolbar */}
      <div className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm px-4 py-3 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="w-px h-5 bg-gray-700" />

        <Network className="w-4 h-4 text-brasil-amarelo" />
        <span className="text-sm font-semibold text-gray-200">
          Grafo de votação
        </span>

        <div className="w-px h-5 bg-gray-700" />

        {/* Select de votação */}
        <select
          value={votacaoSelecionada}
          onChange={(e) => setVotacaoSelecionada(e.target.value)}
          className="flex-1 min-w-48 max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-gray-500 transition"
        >
          <option value="">— Selecione uma votação —</option>
          {votacoes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.descricao.slice(0, 80)}
              {v.descricao.length > 80 ? "..." : ""}
            </option>
          ))}
        </select>

        {votacaoSelecionada && (
          <button
            onClick={sincronizarVotos}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Atualizar votos"}
          </button>
        )}

        {/* Stats */}
        {grafoData && (
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
            <span>
              {grafoData.nodes.filter((n) => n.type === "partido").length}{" "}
              partidos
            </span>
            <span>·</span>
            <span>
              {grafoData.nodes.filter((n) => n.type === "deputado").length}{" "}
              deputados
            </span>
          </div>
        )}
      </div>

      {/* Legenda de votos */}
      <div className="border-b border-gray-800/50 bg-gray-950/50 px-4 py-2 flex items-center gap-4 flex-wrap">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" /> Legenda:
        </span>
        {(Object.entries(LABEL_VOTO) as [TipoVoto, string][]).map(
          ([tipo, label]) => (
            <span
              key={tipo}
              className="flex items-center gap-1.5 text-xs text-gray-400"
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COR_VOTO[tipo] }}
              />
              {label}
            </span>
          ),
        )}
        <span className="text-xs text-gray-500 ml-2">
          · Borda colorida = voto do deputado · Nó maior = partido
        </span>
      </div>

      {/* Canvas principal */}
      <div className="flex-1 relative bg-gray-950 overflow-hidden">
        {!votacaoSelecionada ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Network className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Selecione uma votação</p>
              <p className="text-sm">
                para visualizar o grafo de relações partido → deputado
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Network className="w-12 h-12 mx-auto mb-3 animate-pulse opacity-40" />
              <p className="text-sm">Montando grafo...</p>
            </div>
          </div>
        ) : erro ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 max-w-sm">
              <p className="mb-4">{erro}</p>
              <button
                onClick={sincronizarVotos}
                disabled={syncing}
                className="px-4 py-2 bg-brasil-amarelo text-gray-900 rounded-lg text-sm font-semibold hover:bg-yellow-300 transition disabled:opacity-50"
              >
                {syncing
                  ? "Sincronizando..."
                  : "Sincronizar votos desta votação"}
              </button>
            </div>
          </div>
        ) : grafoData ? (
          <GrafoCanvas data={grafoData} />
        ) : null}
      </div>

      {/* Info bar inferior */}
      {votacaoAtual && (
        <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-2 text-xs text-gray-500 truncate">
          <strong className="text-gray-400">Votação:</strong>{" "}
          {votacaoAtual.descricao}
        </div>
      )}
    </div>
  );
}
