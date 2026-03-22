-- CreateTable
CREATE TABLE "Partido" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,

    CONSTRAINT "Partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deputado" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "urlFoto" TEXT,
    "partidoId" TEXT NOT NULL,

    CONSTRAINT "Deputado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Votacao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Votacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voto" (
    "id" TEXT NOT NULL,
    "deputadoId" TEXT NOT NULL,
    "votacaoId" TEXT NOT NULL,
    "voto" TEXT NOT NULL,

    CONSTRAINT "Voto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Deputado" ADD CONSTRAINT "Deputado_partidoId_fkey" FOREIGN KEY ("partidoId") REFERENCES "Partido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_deputadoId_fkey" FOREIGN KEY ("deputadoId") REFERENCES "Deputado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voto" ADD CONSTRAINT "Voto_votacaoId_fkey" FOREIGN KEY ("votacaoId") REFERENCES "Votacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
