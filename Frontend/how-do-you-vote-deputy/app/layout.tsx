import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PDC — Projeto Como vota Deputado",
  description:
    "Visualize como deputados brasileiros votam em projetos legislativos",
  keywords: ["deputados", "votações", "câmara", "transparência", "política"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans bg-gray-950 text-gray-100 antialiased`}
      >
        <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-3 h-6 rounded-sm bg-brasil-verde" />
                  <div className="w-3 h-6 rounded-sm bg-brasil-amarelo" />
                  <div className="w-3 h-6 rounded-sm bg-brasil-azul" />
                </div>
                <span className="font-bold text-lg tracking-tight">
                  PCD - &nbsp;
                  <span className="text-brasil-amarelo">
                    Projeto Como Vota Deputado ?
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="/" className="hover:text-white transition-colors">
                  Início
                </Link>
                <Link
                  href="/votacoes"
                  className="hover:text-white transition-colors"
                >
                  Votações
                </Link>
                <Link
                  href="/deputados"
                  className="hover:text-white transition-colors"
                >
                  Deputados
                </Link>
                <Link
                  href="/grafo"
                  className="hover:text-white transition-colors"
                >
                  Grafo
                </Link>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
        <footer className="border-t border-gray-800 py-8 text-center text-sm text-gray-500 mt-16">
          <p>
            Dados públicos da{" "}
            <a
              href="https://dadosabertos.camara.leg.br"
              target="_blank"
              className="text-brasil-amarelo hover:underline"
            >
              API da Câmara dos Deputados
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
