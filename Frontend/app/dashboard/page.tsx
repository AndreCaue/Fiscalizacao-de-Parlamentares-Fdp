"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Vote,
  Users,
  BarChart3,
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { statsService } from "@/services/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Resumo {
  totalVotacoes: number;
  votacoesComVotos: number;
  totalDeputados: number;
  totalVotos: number;
  totalPartidos: number;
}

interface ItemDistribuicao {
  tipo: string;
  label: string;
  quantidade: number;
  percentual: number;
  cor: string;
}

interface DisciplinaPartido {
  sigla: string;
  nome: string;
  seguiu: number;
  divergiu: number;
  total: number;
  disciplina: number;
}

interface DeputadoDestaque {
  id: string;
  nome: string;
  urlFoto?: string;
  partido: string;
  estado: string;
  seguiu: number;
  divergiu: number;
  total: number;
  disciplina: number;
}

interface VotacaoDestaque {
  id: string;
  descricao: string;
  data: string;
  siglaTipo?: string;
  totalVotos: number;
  contagem: Record<string, number>;
}

const COR_VOTO: Record<string, string> = {
  SIM: "#22c55e",
  NAO: "#ef4444",
  ABSTENCAO: "#3b82f6",
  OBSTRUCAO: "#f59e0b",
};

function SkeletonCard({ h = "h-28" }: { h?: string }) {
  return (
    <div
      className={`${h} bg-gray-900 border border-gray-800 rounded-2xl animate-pulse`}
    />
  );
}

export default function DashboardPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [distribuicao, setDistribuicao] = useState<ItemDistribuicao[]>([]);
  const [disciplina, setDisciplina] = useState<DisciplinaPartido[]>([]);
  const [deputados, setDeputados] = useState<{
    rebeldes: DeputadoDestaque[];
    alinhados: DeputadoDestaque[];
  }>({ rebeldes: [], alinhados: [] });
  const [votacoes, setVotacoes] = useState<VotacaoDestaque[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      statsService.resumo(),
      statsService.distribuicaoVotos(),
      statsService.disciplinaPartidos(15),
      statsService.deputadosDestaque(10),
      statsService.votacoesDestaque(5),
    ])
      .then(([r, d, dp, dep, v]) => {
        setResumo(r);
        setDistribuicao(d.distribuicao);
        setDisciplina(dp.data);
        setDeputados(dep);
        setVotacoes(v.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">
          Dashboard <span className="text-brasil-amarelo">Analytics</span>
        </h1>
        <p className="text-gray-400 text-sm">
          Visão geral das votações e comportamento parlamentar
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <ResumoCard
              icon={Vote}
              label="Votações"
              valor={resumo?.totalVotacoes ?? 0}
              sub={`${resumo?.votacoesComVotos ?? 0} com votos`}
              cor="text-brasil-amarelo"
            />
            <ResumoCard
              icon={Users}
              label="Deputados"
              valor={resumo?.totalDeputados ?? 0}
              sub="monitorados"
              cor="text-green-400"
            />
            <ResumoCard
              icon={BarChart3}
              label="Votos registrados"
              valor={resumo?.totalVotos ?? 0}
              sub="no banco"
              cor="text-blue-400"
            />
            <ResumoCard
              icon={Building2}
              label="Partidos"
              valor={resumo?.totalPartidos ?? 0}
              sub="rastreados"
              cor="text-purple-400"
            />
          </>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Distribuição geral de votos
        </h2>
        {loading ? (
          <div className="h-16 bg-gray-800 rounded-xl animate-pulse" />
        ) : distribuicao.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum dado disponível</p>
        ) : (
          <>
            <div className="flex h-8 rounded-xl overflow-hidden gap-0.5 mb-4">
              {distribuicao.map((d) => (
                <div
                  key={d.tipo}
                  style={{ width: `${d.percentual}%`, backgroundColor: d.cor }}
                  title={`${d.label}: ${d.quantidade} (${d.percentual}%)`}
                  className="transition-all"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {distribuicao.map((d) => (
                <div key={d.tipo} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: d.cor }}>
                    {d.quantidade.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-xs text-gray-400">{d.label}</p>
                  <p className="text-xs text-gray-600">{d.percentual}%</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Disciplina partidária
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} h="h-8" />
              ))}
            </div>
          ) : disciplina.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Sincronize votações com orientações para ver este dado
            </p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {disciplina.map((p, i) => (
                <div key={p.sigla} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-5 text-right flex-shrink-0">
                    {i + 1}
                  </span>

                  <span className="text-xs font-bold text-gray-300 w-14 flex-shrink-0">
                    {p.sigla}
                  </span>

                  <div className="flex-1 h-4 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${p.disciplina}%`,
                        backgroundColor:
                          p.disciplina >= 80
                            ? "#22c55e"
                            : p.disciplina >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                      }}
                    />
                  </div>

                  <span
                    className="text-xs font-bold w-12 text-right flex-shrink-0"
                    style={{
                      color:
                        p.disciplina >= 80
                          ? "#22c55e"
                          : p.disciplina >= 60
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {p.disciplina}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Votações recentes
            </h2>
            <Link
              href="/votacoes"
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} h="h-16" />
              ))}
            </div>
          ) : votacoes.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Nenhuma votação com votos sincronizados
            </p>
          ) : (
            <div className="space-y-2">
              {votacoes.map((v) => (
                <Link
                  key={v.id}
                  href={`/votacoes/${v.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-200 line-clamp-1 group-hover:text-white transition-colors">
                      {v.descricao}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(v.data), "d MMM yyyy", { locale: ptBR })}
                      <span className="mx-1">·</span>
                      {v.totalVotos} votos
                    </p>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    {["SIM", "NAO", "ABSTENCAO", "OBSTRUCAO"].map((tipo) =>
                      v.contagem[tipo] ? (
                        <div
                          key={tipo}
                          className="w-1.5 rounded-full"
                          style={{
                            height: Math.max(
                              8,
                              Math.min(
                                28,
                                (v.contagem[tipo] / v.totalVotos) * 40,
                              ),
                            ),
                            backgroundColor: COR_VOTO[tipo],
                          }}
                          title={`${tipo}: ${v.contagem[tipo]}`}
                        />
                      ) : null,
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeputadosRanking
          titulo="Deputados mais rebeldes"
          subtitulo="Maior % de divergência com o partido"
          icone={<TrendingDown className="w-4 h-4 text-red-400" />}
          deputados={loading ? [] : deputados.rebeldes}
          loading={loading}
          corBarra="#ef4444"
          metrica="divergiu"
        />
        <DeputadosRanking
          titulo="Deputados mais alinhados"
          subtitulo="Maior % de obediência ao partido"
          icone={<TrendingUp className="w-4 h-4 text-green-400" />}
          deputados={loading ? [] : deputados.alinhados}
          loading={loading}
          corBarra="#22c55e"
          metrica="seguiu"
        />
      </div>
    </div>
  );
}

function ResumoCard({
  icon: Icon,
  label,
  valor,
  sub,
  cor,
}: {
  icon: any;
  label: string;
  valor: number;
  sub: string;
  cor: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <Icon className={`w-6 h-6 mb-3 ${cor}`} />
      <p className="text-2xl font-bold text-gray-100">
        {valor.toLocaleString("pt-BR")}
      </p>
      <p className="text-sm text-gray-300 font-medium">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

function DeputadosRanking({
  titulo,
  subtitulo,
  icone,
  deputados,
  loading,
  corBarra,
  metrica,
}: {
  titulo: string;
  subtitulo: string;
  icone: React.ReactNode;
  deputados: DeputadoDestaque[];
  loading: boolean;
  corBarra: string;
  metrica: "seguiu" | "divergiu";
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        {icone}
        <h2 className="text-sm font-semibold text-gray-200">{titulo}</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">{subtitulo}</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonCard key={i} h="h-12" />
          ))}
        </div>
      ) : deputados.length === 0 ? (
        <p className="text-gray-500 text-sm">
          Sincronize votações com orientações para ver este dado
        </p>
      ) : (
        <div className="space-y-2">
          {deputados.map((dep, i) => {
            const pct =
              metrica === "divergiu"
                ? +((dep.divergiu / dep.total) * 100).toFixed(1)
                : dep.disciplina;

            return (
              <Link
                key={dep.id}
                href={`/deputados/${dep.id}`}
                className="flex items-center gap-3 group"
              >
                <span className="text-xs text-gray-600 w-4 flex-shrink-0">
                  {i + 1}
                </span>

                <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-700 flex-shrink-0">
                  {dep.urlFoto ? (
                    <Image
                      src={dep.urlFoto}
                      alt={dep.nome}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                      {dep.nome[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate group-hover:text-white transition-colors">
                    {dep.nome}
                  </p>
                  <p className="text-xs text-gray-500">
                    {dep.partido} · {dep.estado}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className="text-xs font-bold"
                    style={{ color: corBarra }}
                  >
                    {pct}%
                  </span>
                  <p className="text-xs text-gray-600">{dep.total} vot.</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
