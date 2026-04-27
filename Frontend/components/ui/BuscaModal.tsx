/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  Vote,
  Building2,
  X,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { statsService } from "@/services/api";
import Image from "next/image";

interface ResultadoBusca {
  data: {
    id: string;
    nome: string;
    url_foto?: string;
    estado: string;
    partido: string;
  }[];
}

export function useBuscaModal() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setAberto((prev) => !prev);
      }
      if (e.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { aberto, setAberto };
}

export default function BuscaModal({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResultado(null);
      setSelectedIndex(0);
    }
  }, [aberto]);

  useEffect(() => {
    if (query.length < 2) {
      setResultado(null);
      return;
    }
    clearTimeout(debounceRef?.current ?? undefined);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await statsService.busca(query, 5);
        setResultado(data);
        setSelectedIndex(0);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef?.current ?? undefined);
  }, [query]);

  const itens = resultado
    ? [
        ...(resultado.data ?? []).map((d) => ({
          tipo: "deputado",
          href: `/deputados/${d.id}`,
          label: d.nome,
          sub: `${d.partido} · ${d.estado}`,
          foto: d.url_foto,
        })),
        // ...(resultado.votacoes ?? []).map((v) => ({
        //   tipo: "votacao",
        //   href: `/votacoes/${v.id}`,
        //   label: v.descricao,
        //   sub: `${v.siglaTipo ?? "Votação"} · ${v._count.votos} votos`,
        //   foto: undefined,
        // })),
        // ...(resultado.partidos ?? []).map((p) => ({
        //   tipo: "partido",
        //   href: `/deputados?partido=${p.sigla}`,
        //   label: `${p.sigla} — ${p.nome}`,
        //   sub: `${p._count.deputados} deputados`,
        //   foto: undefined,
        // })),
      ]
    : [];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, itens.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && itens[selectedIndex]) {
        router.push(itens[selectedIndex].href);
        onFechar();
      } else if (e.key === "Escape") {
        onFechar();
      }
    },
    [itens, selectedIndex, router, onFechar],
  );

  if (!aberto) return null;

  const temResultados = resultado && itens.length > 0;
  const semResultados = resultado && itens.length === 0 && !loading;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onFechar}
      />

      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 px-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800">
            {loading ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar deputado, votação ou partido..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-gray-100 placeholder:text-gray-500 text-sm focus:outline-none"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <kbd className="text-xs text-gray-600 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5">
                ESC
              </kbd>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!query || query.length < 2 ? (
              <div className="px-4 py-8 text-center text-gray-600">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  Digite ao menos 2 caracteres para buscar
                </p>
                <p className="text-xs mt-1 text-gray-700">
                  Deputados · Votações · Partidos
                </p>
              </div>
            ) : semResultados ? (
              <div className="px-4 py-8 text-center text-gray-600">
                <p className="text-sm">
                  Nenhum resultado para{" "}
                  <strong className="text-gray-400">&quot;{query}&quot;</strong>
                </p>
              </div>
            ) : temResultados ? (
              <div className="py-2">
                {resultado?.data?.length > 0 && (
                  <Secao
                    titulo="Deputados"
                    icone={<Users className="w-3 h-3" />}
                  >
                    {resultado?.data?.map((dep, i) => {
                      const idx = i;
                      return (
                        <ItemResultado
                          key={dep.id}
                          href={`/deputados/${dep.id}`}
                          selecionado={selectedIndex === idx}
                          onSelect={() => {
                            router.push(`/deputados/${dep.id}`);
                            onFechar();
                          }}
                          onHover={() => setSelectedIndex(idx)}
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-gray-700 flex-shrink-0">
                            {dep.url_foto ? (
                              <Image
                                src={dep.url_foto}
                                alt={dep.nome}
                                height={96}
                                width={96}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                                {dep.nome[0]}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-200 truncate">
                              {dep.nome}
                            </p>
                            <p className="text-xs text-gray-500">
                              {dep.partido} · {dep.estado}
                            </p>
                          </div>
                        </ItemResultado>
                      );
                    })}
                  </Secao>
                )}
              </div>
            ) : null}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1">
                ↑↓
              </kbd>{" "}
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1">
                ↵
              </kbd>{" "}
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-gray-800 border border-gray-700 rounded px-1">
                ESC
              </kbd>{" "}
              fechar
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function Secao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-gray-500 font-medium">
        {icone}
        {titulo}
      </div>
      {children}
    </div>
  );
}

function ItemResultado({
  href,
  selecionado,
  onSelect,
  onHover,
  children,
}: {
  href: string;
  selecionado: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selecionado ? "bg-gray-800" : "hover:bg-gray-800/50"
      }`}
    >
      {children}
      {selecionado && (
        <ArrowRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 ml-auto" />
      )}
    </button>
  );
}
