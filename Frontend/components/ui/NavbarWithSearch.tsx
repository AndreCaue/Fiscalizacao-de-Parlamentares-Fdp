"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
const BuscaModal = dynamic(() => import("./BuscaModal"), {
  ssr: false,
});

export default function NavbarWithSearch() {
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setModalAberto((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-3 h-6 rounded-sm bg-brasil-verde" />
                <div className="w-3 h-6 rounded-sm bg-brasil-amarelo" />
                <div className="w-3 h-6 rounded-sm bg-brasil-azul" />
              </div>
              <span className="font-bold text-lg tracking-tight">
                FDP - &nbsp;
                <span className="text-brasil-amarelo">
                  Fiscalização De Parlamentares!
                </span>
              </span>
            </Link>

            <button
              onClick={() => setModalAberto(true)}
              className="flex-1 max-w-sm hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-800/60 border border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-all"
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="text-xs bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 font-mono hidden lg:block">
                Ctrl K
              </kbd>
            </button>

            <div className="flex items-center gap-1 text-sm text-gray-400 flex-shrink-0">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                Início
              </Link>
              <Link
                href="/votacoes"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                Votações
              </Link>
              <Link
                href="/deputados"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                Deputados
              </Link>
              <Link
                href="/grafo"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                Grafo
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                Dashboard
              </Link>
              {/* Busca mobile */}
              <button
                onClick={() => setModalAberto(true)}
                className="sm:hidden p-1.5 rounded-lg hover:text-white hover:bg-gray-800 transition-all"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <BuscaModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </>
  );
}
