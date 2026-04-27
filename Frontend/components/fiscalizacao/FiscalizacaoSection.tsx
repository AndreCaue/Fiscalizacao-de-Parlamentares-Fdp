"use client";

import { useState } from "react";
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

import {
  useAlertas,
  useEvolucaoPatrimonio,
  useResumoCEAP,
  useEvolucaoMensal,
  useCruzamento,
} from "@/hooks/useFiscalizacao";

import { RiscoScore } from "./RiscoScore";
import { PatrimonioChart } from "./PatrimonioChart";
import { AlertasLista } from "./AlertList";
import { CEAPDashboard } from "./CEAPDashboard";
import { cn } from "@/utils";
import { Button } from "../ui/button";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-zinc-800/60", className)} />
  );
}

function Card({
  titulo,
  children,
  collapsible = false,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  collapsible?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 border-b border-zinc-800/60",
          collapsible &&
            "cursor-pointer hover:bg-zinc-800/30 transition-colors",
        )}
        onClick={collapsible ? () => setOpen(!open) : undefined}
      >
        <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
          {titulo}
        </h3>
        {collapsible &&
          (open ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
          ))}
      </div>
      {(!collapsible || open) && <div className="p-5">{children}</div>}
    </div>
  );
}

function SeletorAno({
  ano,
  onChange,
  opcoes,
}: {
  ano: number;
  onChange: (a: number) => void;
  opcoes: number[];
}) {
  return (
    <div className="flex gap-1">
      {opcoes.map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={cn(
            "text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all",
            ano === a
              ? "bg-zinc-700 border-zinc-600 text-zinc-100"
              : "border-zinc-800 text-zinc-500 hover:text-zinc-300",
          )}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

interface Props {
  deputadoId: string;
  anosCEAP?: number[];
}

export function FiscalizacaoSection({
  deputadoId,
  anosCEAP = [2023, 2024],
}: Props) {
  const [anoCEAP, setAnoCEAP] = useState(anosCEAP[anosCEAP.length - 1]);

  const alertas = useAlertas(deputadoId);
  const patrimonio = useEvolucaoPatrimonio(deputadoId);
  const ceap = useResumoCEAP(deputadoId, anoCEAP);
  const mensal = useEvolucaoMensal(deputadoId, anoCEAP);
  const cruzamento = useCruzamento(deputadoId, anosCEAP);

  const scoreData =
    cruzamento.data ??
    (alertas.data
      ? {
          score_global:
            alertas.data.length > 0
              ? Math.max(...alertas.data.map((a) => a.score_risco))
              : 0,
          nivel_risco: "BAIXO" as const,
          metricas: {
            total_alertas: alertas.data.length,
            anos_analisados: anosCEAP,
          },
        }
      : null);

  return (
    <section className="mt-10 space-y-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-mono uppercase tracking-[0.2em] text-zinc-400">
            Fiscalização Patrimonial
          </h2>
          <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
            Patrimônio TSE · CEAP · Cruzamentos
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={cruzamento.loading}
          onClick={cruzamento.analisar}
          className="border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 font-mono text-xs gap-2"
        >
          {cruzamento.loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Re-analisar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-4">
          {scoreData ? (
            <RiscoScore
              score={scoreData.score_global}
              nivel={scoreData.nivel_risco as any}
              totalAlertas={scoreData.metricas.total_alertas}
              anosAnalisados={scoreData.metricas.anos_analisados}
            />
          ) : (
            <Skeleton className="h-64" />
          )}

          {!alertas.loading && alertas.error && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-zinc-600 text-xs font-mono mb-3">
                Análise ainda não executada.
              </p>
              <Button
                size="sm"
                disabled={cruzamento.loading}
                onClick={cruzamento.analisar}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs"
              >
                {cruzamento.loading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    Analisando…
                  </>
                ) : (
                  "Executar análise"
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card titulo="Alertas detectados" collapsible>
            {alertas.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : alertas.data ? (
              <AlertasLista alertas={alertas.data} />
            ) : (
              <p className="text-zinc-600 text-xs font-mono text-center py-4">
                {alertas.error ?? "Sem alertas."}
              </p>
            )}
          </Card>

          <Card titulo="Evolução patrimonial TSE  2022 → 2026" collapsible>
            {patrimonio.loading ? (
              <Skeleton className="h-48" />
            ) : patrimonio.data ? (
              <PatrimonioChart evolucao={patrimonio.data} />
            ) : (
              <p className="text-zinc-600 text-xs font-mono text-center py-4">
                Dados de patrimônio indisponíveis.
              </p>
            )}
          </Card>

          <Card
            titulo={
              (
                <div className="flex items-center justify-between w-full">
                  <span>Cota Parlamentar (CEAP)</span>
                  <SeletorAno
                    ano={anoCEAP}
                    onChange={setAnoCEAP}
                    opcoes={anosCEAP}
                  />
                </div>
              ) as any
            }
            collapsible
          >
            {ceap.loading ? (
              <Skeleton className="h-64" />
            ) : ceap.data ? (
              <CEAPDashboard resumo={ceap.data} mensal={mensal.data} />
            ) : (
              <p className="text-zinc-600 text-xs font-mono text-center py-4">
                Dados CEAP indisponíveis para {anoCEAP}.
              </p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
