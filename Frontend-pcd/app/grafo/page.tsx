"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Network,
  ArrowLeft,
  RefreshCw,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { votacoesService, integracaoService } from "@/services/api";
import type { Votacao, GrafoData, TipoVoto } from "@/types";
import { LABEL_VOTO, COR_VOTO } from "@/types";
import dynamic from "next/dynamic";
import { TVotacaoOption, VotacaoSelect } from "@/components/ui/Dropdown";

const GrafoCanvas = dynamic(() => import("@/components/grafo/GrafoCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-slate-600">
        <Network className="w-10 h-10 mx-auto mb-3 opacity-20 animate-pulse" />
        <p className="text-sm">Carregando grafo...</p>
      </div>
    </div>
  ),
});

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center">
        <div className="relative mx-auto mb-6 w-24 h-24">
          <div className="absolute inset-0 rounded-full bg-slate-800/60 border border-slate-700/50" />
          <Network className="absolute inset-0 m-auto w-10 h-10 text-slate-600" />
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-slate-600"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateX(40px) translateY(-50%)`,
                opacity: 0.4 + i * 0.1,
              }}
            />
          ))}
        </div>
        <p className="text-slate-400 text-base font-medium mb-1">
          Selecione uma votação
        </p>
        <p className="text-slate-600 text-sm">
          para visualizar o grafo partido → deputado
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center text-slate-500">
        <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin opacity-50" />
        <p className="text-sm">Montando grafo…</p>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onSync,
  syncing,
}: {
  message: string;
  onSync: () => void;
  syncing: boolean;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center max-w-sm">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500/50" />
        <p className="text-slate-400 text-sm mb-5">{message}</p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 font-medium transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando…" : "Sincronizar votos"}
        </button>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      {color && (
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: color }}
        />
      )}
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 font-semibold">{value}</span>
    </span>
  );
}

export default function GrafoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [isFetchingVotacoes, setIsFetchingVotacoes] = useState(true);

  const [votacaoSelecionada, setVotacaoSelecionada] = useState<string | null>(
    searchParams.get("votacaoId") ?? null,
  );

  const [grafoData, setGrafoData] = useState<GrafoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setIsFetchingVotacoes(true);
    votacoesService
      .listar({ limit: 100 })
      .then((r) => setVotacoes(r.data))
      .catch(() => {})
      .finally(() => setIsFetchingVotacoes(false));
  }, []);

  const votacaoOptions: TVotacaoOption[] = votacoes.map((v) => ({
    id: v.id,
    descricao: v.descricao,
  }));

  const carregarGrafo = useCallback(async (id: string) => {
    setLoading(true);
    setErro("");
    setGrafoData(null);
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

  function handleSelectVotacao(id: string | null) {
    setVotacaoSelecionada(id);

    if (id) {
      router.replace(`?votacaoId=${id}`, { scroll: false });
    } else {
      router.replace("?", { scroll: false });
      setGrafoData(null);
      setErro("");
    }
  }

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

  const contagemVotos = grafoData
    ? grafoData.nodes
        ?.filter((n) => n.type === "deputado")
        .reduce<Record<string, number>>((acc, n) => {
          const v = n.data.voto as string;
          acc[v] = (acc[v] ?? 0) + 1;
          return acc;
        }, {})
    : null;

  const votacaoAtual = votacoes.find((v) => v.id === votacaoSelecionada);

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-950 text-slate-200">
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm px-4 py-2.5 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>

        <div className="w-px h-5 bg-slate-800 flex-shrink-0" />

        <div className="flex items-center gap-2 flex-shrink-0">
          <Network className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200 hidden sm:inline">
            Grafo de votação
          </span>
        </div>

        <div className="w-px h-5 bg-slate-800 flex-shrink-0 hidden sm:block" />

        <VotacaoSelect
          options={votacaoOptions}
          value={votacaoSelecionada}
          onChange={handleSelectVotacao}
          placeholder="Buscar votação…"
          isFetching={isFetchingVotacoes}
          className="flex-1 min-w-[200px] max-w-[440px]"
        />

        {votacaoSelecionada && (
          <button
            onClick={sincronizarVotos}
            disabled={syncing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition disabled:opacity-40 flex-shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">
              {syncing ? "Sincronizando…" : "Atualizar votos"}
            </span>
          </button>
        )}

        {grafoData && contagemVotos && (
          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <StatChip
              label="partidos"
              value={
                grafoData.nodes?.filter((n) => n.type === "partido").length
              }
            />
            <span className="text-slate-700 text-xs">·</span>
            {(Object.entries(LABEL_VOTO) as [TipoVoto, string][]).map(
              ([tipo, label]) =>
                contagemVotos[tipo] ? (
                  <StatChip
                    key={tipo}
                    label={label}
                    value={contagemVotos[tipo]}
                    color={COR_VOTO[tipo]}
                  />
                ) : null,
            )}
          </div>
        )}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {!votacaoSelecionada ? (
          <EmptyState />
        ) : loading ? (
          <LoadingState />
        ) : erro ? (
          <ErrorState
            message={erro}
            onSync={sincronizarVotos}
            syncing={syncing}
          />
        ) : grafoData ? (
          <GrafoCanvas data={grafoData} />
        ) : null}
      </div>

      {votacaoAtual && (
        <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-2 flex items-center gap-2">
          <Info className="w-3 h-3 text-slate-600 flex-shrink-0" />
          <p className="text-xs text-slate-500 truncate">
            <span className="text-slate-400 font-medium">Votação: </span>
            {votacaoAtual.descricao}
          </p>
        </div>
      )}
    </div>
  );
}
