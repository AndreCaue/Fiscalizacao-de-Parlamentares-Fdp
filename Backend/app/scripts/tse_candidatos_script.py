import zipfile
import time
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from app.database import engine

# ==========================================================
# CONFIGURAÇÕES
# ==========================================================
ANO = 2022

BASE_DIR = Path(__file__).resolve().parents[2]
ZIP_PATH = BASE_DIR / "data" / "tse_cache" / f"consulta_cand_{ANO}.zip"
CSV_INTERNO = f"consulta_cand_{ANO}_BRASIL.csv"

CHUNKSIZE = 1000


# ==========================================================
# SCRIPT PRINCIPAL
# ==========================================================
def main():
    inicio = time.time()

    print("=" * 60)
    print("🚀 IMPORTANDO CANDIDATOS TSE")
    print("=" * 60)

    print(f"📦 ZIP: {ZIP_PATH}")
    print(f"📁 Existe? {ZIP_PATH.exists()}")

    if not ZIP_PATH.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {ZIP_PATH}")

    # limpa tabela antes de importar
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM tse_candidato"))

    print("🧹 Tabela tse_candidato limpa.")

    # ======================================================
    # LEITURA DO ZIP
    # ======================================================
    with zipfile.ZipFile(ZIP_PATH) as z:

        arquivos = z.namelist()

        if CSV_INTERNO not in arquivos:
            raise Exception(
                f"Arquivo {CSV_INTERNO} não encontrado no ZIP.\n"
                f"Arquivos disponíveis: {arquivos}"
            )

        print(f"✅ CSV encontrado: {CSV_INTERNO}")
        print("📥 Lendo arquivo...")

        with z.open(CSV_INTERNO) as f:

            df = pd.read_csv(
                f,
                sep=";",
                encoding="latin1",
                low_memory=False,
                dtype={
                    "SQ_CANDIDATO": str,
                    "NR_CPF_CANDIDATO": str
                }
            )

    print(f"📄 Linhas lidas: {len(df):,}")

    # ======================================================
    # RENOMEAR COLUNAS
    # ======================================================
    df = df.rename(columns={
        "SQ_CANDIDATO": "sq_candidato",
        "NM_CANDIDATO": "nome",
        "NM_URNA_CANDIDATO": "nome_urna",
        "NR_CPF_CANDIDATO": "cpf",
        "ANO_ELEICAO": "ano"
    })

    # ======================================================
    # SELECIONAR COLUNAS
    # ======================================================
    df = df[
        [
            "sq_candidato",
            "nome",
            "nome_urna",
            "cpf",
            "ano"
        ]
    ]

    # ======================================================
    # LIMPEZA
    # ======================================================
    df["cpf"] = df["cpf"].replace("-4", None)
    df["nome"] = df["nome"].astype(str).str.strip()
    df["nome_urna"] = df["nome_urna"].astype(str).str.strip()

    # remove sq_candidato vazio
    df = df.dropna(subset=["sq_candidato"])

    # remove duplicados reais
    antes = len(df)
    df = df.drop_duplicates(subset=["sq_candidato"], keep="first")
    removidos = antes - len(df)

    print(f"🧹 Duplicados removidos: {removidos:,}")
    print(f"📊 Registros finais: {len(df):,}")

    # ======================================================
    # IMPORTAÇÃO
    # ======================================================
    print("💾 Gravando no banco...")

    df.to_sql(
        "tse_candidato",
        con=engine,
        if_exists="append",
        index=False,
        chunksize=CHUNKSIZE,
        method=None
    )

    tempo = time.time() - inicio

    print("=" * 60)
    print("🎉 IMPORTAÇÃO CONCLUÍDA")
    print("=" * 60)
    print(f"📄 Total importado: {len(df):,}")
    print(f"⏱ Tempo total: {tempo:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()