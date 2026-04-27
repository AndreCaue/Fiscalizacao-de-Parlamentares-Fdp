"use client";

import { useState } from "react";
import { type ResumoCEAP, type EvolucaoMensal } from "@/hooks/useFiscalizacao";
import { cn } from "@/lib/utils";

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function formatBRL(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function GraficoMensal({ dados }: { dados: EvolucaoMensal[] }) {
  const max = Math.max(...dados.map((d) => d.total), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {dados.map((d) => {
        const pct = (d.total / max) * 100;
        return (
          <div
            key={d.mes}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div
              className="relative w-full flex items-end"
              style={{ height: "72px" }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[9px] font-mono text-zinc-300 whitespace-nowrap pointer-events-none">
                {formatBRL(d.total)}
              </div>
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-500",
                  d.total > max * 0.8
                    ? "bg-red-500/60"
                    : d.total > max * 0.5
                      ? "bg-amber-500/60"
                      : "bg-zinc-600/80",
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-zinc-600">
              {MESES[d.mes - 1]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TabelaCategorias({
  categorias,
}: {
  categorias: ResumoCEAP["por_categoria"];
}) {
  const max = Math.max(...categorias.map((c) => c.total), 1);

  return (
    <div className="space-y-2">
      {categorias.slice(0, 8).map((cat) => {
        const pct = (cat.total / max) * 100;
        return (
          <div key={cat.tipo_despesa}>
            <div className="flex justify-between items-center mb-0.5">
              <span
                className="text-xs text-zinc-400 truncate max-w-[65%]"
                title={cat.tipo_despesa}
              >
                {cat.tipo_despesa}
              </span>
              <span className="text-xs font-mono text-zinc-300 shrink-0 ml-2">
                {formatBRL(cat.total)}
              </span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500/60 rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabelaFornecedores({
  fornecedores,
}: {
  fornecedores: ResumoCEAP["top_fornecedores"];
}) {
  return (
    <div className="space-y-1">
      {fornecedores.slice(0, 8).map((f, i) => (
        <div
          key={f.cnpj_cpf}
          className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0"
        >
          <span className="text-[10px] font-mono text-zinc-600 w-4 shrink-0">
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-300 truncate">
              {f.nome_fornecedor || "—"}
            </p>
            <p className="text-[10px] font-mono text-zinc-600">{f.cnpj_cpf}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono text-zinc-200">
              {formatBRL(f.total)}
            </p>
            <p className="text-[10px] font-mono text-zinc-600">
              {f.quantidade}×
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

type Tab = "categorias" | "fornecedores";

interface Props {
  resumo: ResumoCEAP;
  mensal: EvolucaoMensal[] | null;
}

export function CEAPDashboard({ resumo, mensal }: Props) {
  const [tab, setTab] = useState<Tab>("categorias");

  const razaoPct = (resumo.razao_ceap_salario * 100).toFixed(1);
  const razaoCor =
    resumo.razao_ceap_salario >= 1.2
      ? "text-red-400"
      : resumo.razao_ceap_salario >= 0.8
        ? "text-amber-400"
        : "text-emerald-400";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            Total CEAP {resumo.ano}
          </p>
          <p className="text-xl font-mono font-bold text-zinc-100">
            {formatBRL(resumo.total_gasto)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
            CEAP / Salário
          </p>
          <p className={cn("text-xl font-mono font-bold", razaoCor)}>
            {razaoPct}%
          </p>
        </div>
      </div>

      {mensal && mensal.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Gastos mensais
          </p>
          <GraficoMensal dados={mensal} />
        </div>
      )}

      <div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-4">
          {(["categorias", "fornecedores"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 text-xs font-mono py-1.5 rounded-md transition-all capitalize",
                tab === t
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "categorias" && (
          <TabelaCategorias categorias={resumo.por_categoria} />
        )}
        {tab === "fornecedores" && (
          <TabelaFornecedores fornecedores={resumo.top_fornecedores} />
        )}
      </div>
    </div>
  );
}
