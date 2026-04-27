"use client";

import { type EvolucaoPatrimonio } from "@/hooks/useFiscalizacao";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function formatBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface BarraProps {
  label: string;
  valor2022: number;
  valor2026: number;
  maxValor: number;
}

function BarraComparativa({
  label,
  valor2022,
  valor2026,
  maxValor,
}: BarraProps) {
  const pct2022 = maxValor > 0 ? (valor2022 / maxValor) * 100 : 0;
  const pct2026 = maxValor > 0 ? (valor2026 / maxValor) * 100 : 0;
  const cresceu = valor2026 > valor2022;
  const igual = valor2026 === valor2022;

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-xs text-zinc-400 truncate max-w-[55%]"
          title={label}
        >
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {!igual && (
            <span
              className={cn(
                "text-[10px] font-mono",
                cresceu ? "text-red-400" : "text-emerald-400",
              )}
            >
              {cresceu ? "+" : ""}
              {formatBRL(valor2026 - valor2022)}
            </span>
          )}
        </div>
      </div>

      <div className="relative h-3 bg-zinc-800 rounded-full mb-1 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-zinc-500 rounded-full transition-all duration-700"
          style={{ width: `${pct2022}%` }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-400">
          {formatBRL(valor2022)}
        </span>
      </div>

      <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-700 delay-150",
            cresceu ? "bg-red-500/70" : "bg-emerald-500/70",
          )}
          style={{ width: `${pct2026}%` }}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-300">
          {formatBRL(valor2026)}
        </span>
      </div>
    </div>
  );
}

interface Props {
  evolucao: EvolucaoPatrimonio;
}

export function PatrimonioChart({ evolucao }: Props) {
  const {
    total_2022,
    total_2026,
    variacao_absoluta,
    variacao_percentual,
    por_tipo,
  } = evolucao;

  const cresceu = variacao_absoluta > 0;
  const igual = variacao_absoluta === 0;
  const maxValor = Math.max(
    ...por_tipo.map((t) => Math.max(t.valor_2022, t.valor_2026)),
    1,
  );

  const TrendIcon = igual ? Minus : cresceu ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-5">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            2022
          </p>
          <p className="text-lg font-mono font-bold text-zinc-200">
            {formatBRL(total_2022)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            2026
          </p>
          <p className="text-lg font-mono font-bold text-zinc-200">
            {formatBRL(total_2026)}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4",
            cresceu
              ? "border-red-800 bg-red-950/30"
              : "border-emerald-800 bg-emerald-950/30",
          )}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            Variação
          </p>
          <div className="flex items-center gap-1">
            <TrendIcon
              className={cn(
                "w-4 h-4",
                cresceu ? "text-red-400" : "text-emerald-400",
              )}
            />
            <p
              className={cn(
                "text-base font-mono font-bold",
                cresceu ? "text-red-400" : "text-emerald-400",
              )}
            >
              {variacao_percentual != null
                ? `${variacao_percentual > 0 ? "+" : ""}${variacao_percentual.toFixed(1)}%`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-zinc-500 inline-block" />{" "}
          2022
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2.5 h-2.5 rounded-sm inline-block",
              cresceu ? "bg-red-500/70" : "bg-emerald-500/70",
            )}
          />{" "}
          2026
        </span>
      </div>

      {/* Barras por tipo */}
      {por_tipo.length > 0 ? (
        <div className="space-y-4">
          {por_tipo.slice(0, 8).map((tipo) => (
            <BarraComparativa
              key={tipo.tipo}
              label={tipo.tipo}
              valor2022={tipo.valor_2022}
              valor2026={tipo.valor_2026}
              maxValor={maxValor}
            />
          ))}
        </div>
      ) : (
        <p className="text-zinc-600 font-mono text-xs text-center py-4">
          Sem dados de breakdown por tipo.
        </p>
      )}
    </div>
  );
}
