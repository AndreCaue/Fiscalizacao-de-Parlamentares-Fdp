"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface Alerta {
  id: number;
  tipo: string;
  score_risco: number;
  titulo: string;
  descricao: string;
  valor_ref: number | null;
  resolvido: boolean;
}

export interface CruzamentoResult {
  deputado_id: string;
  score_global: number;
  nivel_risco: "BAIXO" | "MÉDIO" | "ALTO" | "CRÍTICO";
  alertas: Alerta[];
  metricas: {
    total_alertas: number;
    anos_analisados: number[];
  };
}

export interface EvolucaoPatrimonio {
  deputado_id: string;
  total_2022: number;
  total_2026: number;
  variacao_absoluta: number;
  variacao_percentual: number | null;
  bens_2022: number;
  bens_2026: number;
  por_tipo: {
    tipo: string;
    valor_2022: number;
    valor_2026: number;
    variacao: number;
  }[];
}

export interface GastoCategoria {
  tipo_despesa: string;
  total: number;
  quantidade: number;
  media_por_item: number;
}

export interface GastoFornecedor {
  nome_fornecedor: string;
  cnpj_cpf: string;
  total: number;
  quantidade: number;
}

export interface ResumoCEAP {
  deputado_id: string;
  ano: number;
  total_gasto: number;
  total_remuneracao_anual: number;
  razao_ceap_salario: number;
  por_categoria: GastoCategoria[];
  top_fornecedores: GastoFornecedor[];
}

export interface EvolucaoMensal {
  mes: number;
  total: number;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export function useAlertas(deputadoId: string) {
  const [data, setData] = useState<Alerta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJSON<Alerta[]>(`/irregularidades/${deputadoId}/alertas`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deputadoId]);

  return { data, loading, error };
}

export function useEvolucaoPatrimonio(deputadoId: string) {
  const [data, setData] = useState<EvolucaoPatrimonio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJSON<EvolucaoPatrimonio>(`/patrimonio/${deputadoId}/evolucao`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deputadoId]);

  return { data, loading, error };
}

export function useResumoCEAP(deputadoId: string, ano: number) {
  const [data, setData] = useState<ResumoCEAP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJSON<ResumoCEAP>(`/ceap/${deputadoId}/resumo?ano=${ano}`)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deputadoId, ano]);

  return { data, loading, error };
}

export function useEvolucaoMensal(deputadoId: string, ano: number) {
  const [data, setData] = useState<EvolucaoMensal[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJSON<EvolucaoMensal[]>(`/ceap/${deputadoId}/mensal?ano=${ano}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [deputadoId, ano]);

  return { data, loading };
}

export function useCruzamento(
  deputadoId: string,
  anos: number[] = [2023, 2024],
) {
  const [data, setData] = useState<CruzamentoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analisar = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = anos.map((a) => `anos_ceap=${a}`).join("&");
      const res = await fetch(
        `${API_BASE}/irregularidades/${deputadoId}/analisar?${query}`,
        {
          method: "POST",
        },
      );
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, analisar };
}
