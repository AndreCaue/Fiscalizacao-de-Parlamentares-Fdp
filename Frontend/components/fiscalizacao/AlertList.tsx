"use client";

import { type Alerta } from "@/hooks/useFiscalizacao";
import { cn } from "@/utils";
import {
  AlertTriangle,
  TrendingUp,
  Building2,
  ShoppingBag,
  FileQuestion,
  Fuel,
  CornerLeftUp,
} from "lucide-react";

const TIPO_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    cor: string;
    bg: string;
  }
> = {
  PATRIMONIO_SALTO: {
    icon: TrendingUp,
    cor: "text-orange-400",
    bg: "bg-orange-950/50",
  },
  CEAP_PROPORCAO_ALTA: {
    icon: AlertTriangle,
    cor: "text-amber-400",
    bg: "bg-amber-950/50",
  },
  CEAP_FORNECEDOR_UNICO: {
    icon: Building2,
    cor: "text-red-400",
    bg: "bg-red-950/50",
  },
  CEAP_CATEGORIA_SUSPEITA: {
    icon: Fuel,
    cor: "text-rose-400",
    bg: "bg-rose-950/50",
  },
  PATRIMONIO_SEM_DADOS: {
    icon: FileQuestion,
    cor: "text-zinc-400",
    bg: "bg-zinc-800/50",
  },
};

const DEFAULT_CONFIG = {
  icon: ShoppingBag,
  cor: "text-zinc-400",
  bg: "bg-zinc-800/50",
};

function ScoreBadge({ score }: { score: number }) {
  const cor =
    score >= 80
      ? "bg-red-500/20 text-red-400 border-red-700"
      : score >= 60
        ? "bg-orange-500/20 text-orange-400 border-orange-700"
        : score >= 35
          ? "bg-amber-500/20 text-amber-400 border-amber-700"
          : "bg-zinc-700/40 text-zinc-400 border-zinc-600";

  return (
    <span
      className={cn(
        "font-mono text-xs px-2 py-0.5 rounded border font-bold whitespace-nowrap",
        cor,
      )}
    >
      {score.toFixed(0)} pts
    </span>
  );
}

function formatarValor(valor: number | null) {
  if (valor === null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  alertas: Alerta[];
}

export function AlertasLista({ alertas }: Props) {
  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
        <p className="text-zinc-500 font-mono text-sm">
          Nenhum alerta encontrado.
        </p>
      </div>
    );
  }

  const ordenados = [...alertas].sort((a, b) => b.score_risco - a.score_risco);

  return (
    <div className="flex flex-col gap-2">
      {ordenados.map((alerta, i) => {
        const cfg = TIPO_CONFIG[alerta.tipo] ?? DEFAULT_CONFIG;
        const Icon = cfg.icon;

        return (
          <div
            key={alerta.id}
            className={cn(
              "group relative rounded-xl border border-white/5 p-4 flex gap-4 items-start",
              "transition-all duration-200 hover:border-white/10 hover:bg-white/[0.02]",
              cfg.bg,
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className={cn(
                "shrink-0 w-9 h-9 rounded-lg flex items-center justify-center",
                "bg-black/30 border border-white/10",
              )}
            >
              <Icon className={CornerLeftUp} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-zinc-100 leading-snug">
                  {alerta.titulo}
                </p>
                <ScoreBadge score={alerta.score_risco} />
              </div>

              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {alerta.descricao}
              </p>

              {alerta.valor_ref !== null && (
                <p
                  className={cn("text-xs font-mono mt-2 font-medium", cfg.cor)}
                >
                  Valor envolvido: {formatarValor(alerta.valor_ref)}
                </p>
              )}

              <span className="inline-block mt-2 text-[10px] font-mono uppercase tracking-widest text-zinc-600 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                {alerta.tipo.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
