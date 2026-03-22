"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  RefreshCw,
  BarChart3,
  Users,
  Vote,
} from "lucide-react";
import { votacoesService, integracaoService } from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Votacao } from "@/types";

export default function HomePage() {
  const [votacoes, setVotacoes] = useState<Votacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    carregarVotacoes();
  }, []);

  async function carregarVotacoes() {
    setLoading(true);
    try {
      const { data } = await votacoesService.recentes(12);
      setVotacoes(data);
    } catch {
      // banco vazio — sem dados ainda
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("Sincronizando com a API da Câmara dos Deputados...");
    try {
      const resultado = await integracaoService.syncCompleto();
      setSyncMsg(
        `✅ Sincronizado! Partidos: ${resultado.partidos?.sincronizados ?? 0} | ` +
          `Deputados: ${resultado.deputados?.sincronizados ?? 0} | ` +
          `Votações: ${resultado.votacoes?.sincronizados ?? 0}`,
      );
      await carregarVotacoes();
    } catch {
      setSyncMsg(
        "❌ Erro na sincronização. Verifique se o backend está rodando.",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-700 text-xs text-gray-400 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-brasil-verde animate-pulse" />
          Dados em tempo real da Câmara dos Deputados
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Transparência nas{" "}
          <span className="text-brasil-amarelo">votações</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Visualize como deputados brasileiros votam em projetos legislativos.
          Dados públicos, atualizados automaticamente.
        </p>

        {/* Sync button */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brasil-amarelo text-gray-900 font-semibold rounded-lg hover:bg-yellow-300 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar dados"}
          </button>
          {syncMsg && (
            <p className="text-sm text-gray-400 max-w-lg text-center">
              {syncMsg}
            </p>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-12">
        {[
          {
            icon: Vote,
            label: "Votações nominais",
            color: "text-brasil-amarelo",
          },
          {
            icon: Users,
            label: "Deputados monitorados",
            color: "text-brasil-verde",
          },
          {
            icon: BarChart3,
            label: "Partidos rastreados",
            color: "text-blue-400",
          },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center"
          >
            <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
            <p className="text-sm text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Votações recentes */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Votações recentes</h2>
          <Link
            href="/votacoes"
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-800 rounded mb-3 w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : votacoes.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Vote className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Nenhuma votação encontrada</p>
            <p className="text-sm">
              Clique em &quot;Sincronizar dados&quot; para carregar as votações
              da Câmara
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {votacoes.map((votacao) => (
              <Link
                key={votacao.id}
                href={`/votacoes/${votacao.id}`}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-800/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                    {votacao.siglaTipo || votacao.tipo}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                <p className="text-sm font-medium text-gray-200 line-clamp-3 mb-4 leading-relaxed">
                  {votacao.descricao}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(votacao.data), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                  {votacao._count && (
                    <>
                      <span className="mx-1">·</span>
                      <Users className="w-3.5 h-3.5" />
                      {votacao._count.votos} votos
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
