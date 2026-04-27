import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NavbarWithSearch from "@/components/ui/NavbarWithSearch";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "FDP — Fiscalizando Deputados Públicos",
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
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={cn("font-sans", geist.variable)}
    >
      <body
        className={`${geist.variable} ${jetbrainsMono.variable} font-sans bg-gray-950 text-gray-100 antialiased`}
      >
        <NavbarWithSearch />
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
