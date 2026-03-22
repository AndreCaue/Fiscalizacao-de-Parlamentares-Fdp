-- AlterTable
ALTER TABLE "votos" ADD COLUMN     "seguiuOrientacao" BOOLEAN;

-- CreateTable
CREATE TABLE "orientacoes_bancada" (
    "id" TEXT NOT NULL,
    "votacaoId" TEXT NOT NULL,
    "siglaPartidoBloco" TEXT NOT NULL,
    "codPartidoBloco" INTEGER,
    "tipoLideranca" TEXT NOT NULL,
    "orientacao" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orientacoes_bancada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orientacoes_bancada_votacaoId_siglaPartidoBloco_key" ON "orientacoes_bancada"("votacaoId", "siglaPartidoBloco");

-- AddForeignKey
ALTER TABLE "orientacoes_bancada" ADD CONSTRAINT "orientacoes_bancada_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "votacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
