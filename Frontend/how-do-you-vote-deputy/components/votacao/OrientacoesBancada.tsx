"use client";

import type { OrientacaoBancada, TipoOrientacao } from "@/types";
import { LABEL_ORIENTACAO, COR_ORIENTACAO } from "@/types";

interface Props {
  orientacoes: OrientacaoBancada[];
}

const ORDEM_ORIENTACAO: TipoOrientacao[] = [
  "SIM",
  "NAO",
  "ABSTENCAO",
  "OBSTRUCAO",
  "LIBERADO",
  "AUSENTE",
];

export default function OrientacoesBancada({ orientacoes }: Props) {
  if (!orientacoes || orientacoes.length === 0) return null;

  // Separa blocos especiais (Governo, Oposição, Maioria, Minoria) de partidos
  const blocos = orientacoes.filter((o) => o.tipoLideranca === "B");
  const partidos = orientacoes.filter((o) => o.tipoLideranca === "P");

  // Agrupa partidos por orientação
  const porOrientacao = new Map<TipoOrientacao, OrientacaoBancada[]>();
  for (const o of partidos) {
    const tipo = o.orientacao as TipoOrientacao;
    if (!porOrientacao.has(tipo)) porOrientacao.set(tipo, []);
    porOrientacao.get(tipo)!.push(o);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Orientação das bancadas
      </h3>

      {/* Blocos especiais (Governo, Oposição, etc.) */}
      {blocos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
          {blocos
            .filter((b) => b.orientacao !== "AUSENTE")
            .map((bloco) => {
              const cor =
                COR_ORIENTACAO[bloco.orientacao as TipoOrientacao] || "#4b5563";
              return (
                <div
                  key={bloco.siglaPartidoBloco}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
                  style={{
                    borderColor: `${cor}50`,
                    backgroundColor: `${cor}15`,
                    color: cor,
                  }}
                >
                  <span className="text-gray-300">
                    {bloco.siglaPartidoBloco}
                  </span>
                  <span>→</span>
                  <span>
                    {LABEL_ORIENTACAO[bloco.orientacao as TipoOrientacao] ||
                      bloco.orientacao}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Partidos agrupados por orientação */}
      <div className="space-y-3">
        {ORDEM_ORIENTACAO.map((tipo) => {
          const grupo = porOrientacao.get(tipo);
          if (!grupo || grupo.length === 0) return null;
          const cor = COR_ORIENTACAO[tipo];
          const label = LABEL_ORIENTACAO[tipo];

          return (
            <div key={tipo} className="flex items-start gap-3">
              {/* Label da orientação */}
              <div
                className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-md min-w-20 text-center"
                style={{
                  backgroundColor: `${cor}20`,
                  color: cor,
                  border: `1px solid ${cor}40`,
                }}
              >
                {label}
              </div>

              {/* Chips dos partidos */}
              <div className="flex flex-wrap gap-1.5">
                {grupo.map((o) => (
                  <span
                    key={o.siglaPartidoBloco}
                    className="text-xs px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300"
                    title={o.siglaPartidoBloco}
                  >
                    {o.siglaPartidoBloco}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 mt-3">
        {partidos.length} partido{partidos.length !== 1 ? "s" : ""} com
        orientação registrada
      </p>
    </div>
  );
}
