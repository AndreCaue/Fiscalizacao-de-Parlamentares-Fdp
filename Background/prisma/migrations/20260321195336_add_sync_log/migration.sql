/*
  Warnings:

  - You are about to drop the `Deputado` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Partido` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Votacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Voto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Deputado" DROP CONSTRAINT "Deputado_partidoId_fkey";

-- DropForeignKey
ALTER TABLE "Voto" DROP CONSTRAINT "Voto_deputadoId_fkey";

-- DropForeignKey
ALTER TABLE "Voto" DROP CONSTRAINT "Voto_votacaoId_fkey";

-- DropTable
DROP TABLE "Deputado";

-- DropTable
DROP TABLE "Partido";

-- DropTable
DROP TABLE "Votacao";

-- DropTable
DROP TABLE "Voto";

-- CreateTable
CREATE TABLE "partidos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deputados" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "partidoId" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "urlFoto" TEXT,
    "email" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deputados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votacoes" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "siglaTipo" TEXT,
    "uri" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votos" (
    "id" TEXT NOT NULL,
    "deputadoId" TEXT NOT NULL,
    "votacaoId" TEXT NOT NULL,
    "voto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liderancas" (
    "id" TEXT NOT NULL,
    "deputadoId" TEXT NOT NULL,
    "partidoId" TEXT,
    "tipo" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liderancas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mensagem" TEXT,
    "registros" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partidos_sigla_key" ON "partidos"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "votos_deputadoId_votacaoId_key" ON "votos"("deputadoId", "votacaoId");

-- AddForeignKey
ALTER TABLE "deputados" ADD CONSTRAINT "deputados_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_deputadoId_fkey" FOREIGN KEY ("deputadoId") REFERENCES "deputados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votos" ADD CONSTRAINT "votos_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "votacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liderancas" ADD CONSTRAINT "liderancas_deputadoId_fkey" FOREIGN KEY ("deputadoId") REFERENCES "deputados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liderancas" ADD CONSTRAINT "liderancas_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "partidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
