# app/scripts/importar_patrimonio_tse.py

import time
import zipfile
from pathlib import Path

import pandas as pd
from sqlalchemy import text

from app.database import engine

# ==========================================================
# CONFIGURAÇÕES
# ==========================================================
ANO = 2022
ZIP_NAME = f"bem_candidato_{ANO}.zip"
CSV_INTERNO = f"bem_candidato_{ANO}_BRASIL.csv"
TABELA = "patrimonio_tse"
CHUNKSIZE = 1000

BASE_DIR = Path(__file__).resolve().parents[2]
ZIP_PATH = BASE_DIR / "data" / "tse_cache" / ZIP_NAME

# ==========================================================
# FUNÇÕES AUXILIARES
# ==========================================================
def limpar_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Renomeia colunas e normaliza dados.
    """

    mapping = {
    "SQ_CANDIDATO": "sq_candidato",
    "ANO_ELEICAO": "ano_eleicao",

    "NR_ORDEM_BEM_CANDIDATO": "nr_ordem_bem",
    "DS_TIPO_BEM_CANDIDATO": "ds_tipo_bem",
    "DS_BEM_CANDIDATO": "ds_bem",
    "VR_BEM_CANDIDATO": "vr_bem_candidato",
}

    cols_existentes = {k: v for k, v in mapping.items() if k in df.columns}
    print(df.columns.tolist())
    df = df.rename(columns=cols_existentes)

    # Valor monetário
    if "vr_bem_candidato" in df.columns:
        df["vr_bem_candidato"] = pd.to_numeric(
            df["vr_bem_candidato"]
            .astype(str)
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False),
            errors="coerce",
        )

    # Ano fixo
    df["ano_eleicao"] = ANO

    # Inteiros
    if "nr_ordem_bem" in df.columns:
        df["nr_ordem_bem"] = df["nr_ordem_bem"].fillna(0).astype(int)

    # Remove linhas sem dados essenciais
    essenciais = ["sq_candidato", "ds_bem"]
    existentes = [c for c in essenciais if c in df.columns]

    if existentes:
        df = df.dropna(subset=existentes)

    # Mantém apenas colunas úteis que existirem
    colunas_final = [
        "sq_candidato",
        "nome_candidato",
        "ano_eleicao",
        "nr_ordem_bem",
        "ds_tipo_bem",
        "ds_bem",
        "vr_bem_candidato",
    ]

    colunas_final = [c for c in colunas_final if c in df.columns]
    df = df[colunas_final]

    return df


def otimizar_sqlite():
    """
    Melhora velocidade no SQLite.
    """
    with engine.begin() as conn:
        conn.execute(text("PRAGMA journal_mode = MEMORY"))
        conn.execute(text("PRAGMA synchronous = OFF"))
        conn.execute(text("PRAGMA temp_store = MEMORY"))
        conn.execute(text("PRAGMA cache_size = 100000"))


# ==========================================================
# SCRIPT PRINCIPAL
# ==========================================================
def main():
    inicio_total = time.time()

    print("=" * 60)
    print("🚀 IMPORTADOR TSE - PATRIMÔNIO BRASIL")
    print("=" * 60)

    print(f"📦 Arquivo ZIP: {ZIP_PATH}")
    print(f"📁 Existe? {ZIP_PATH.exists()}")

    if not ZIP_PATH.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {ZIP_PATH}")

    otimizar_sqlite()

    print("\n🔍 Abrindo ZIP...")

    with zipfile.ZipFile(ZIP_PATH) as z:
        arquivos = z.namelist()

        if CSV_INTERNO not in arquivos:
            raise Exception(
                f"Arquivo {CSV_INTERNO} não encontrado no ZIP.\n"
                f"Arquivos disponíveis: {arquivos}"
            )

        print(f"✅ CSV interno encontrado: {CSV_INTERNO}")
        print("\n📥 Iniciando leitura em chunks...\n")

        total_linhas = 0
        total_chunks = 0
        inicio_insert = time.time()

        with z.open(CSV_INTERNO) as f:

            leitor = pd.read_csv(
                f,
                sep=";",
                encoding="latin1",
                chunksize=CHUNKSIZE,
                dtype={
                    "SQ_CANDIDATO": str,
                    "NR_ORDEM_BEM": "Int64",
                },
                low_memory=False,
            )

            for chunk in leitor:
                total_chunks += 1

                chunk = limpar_dataframe(chunk)

                linhas = len(chunk)

                if linhas == 0:
                    continue

                chunk.to_sql(
                    name=TABELA,
                    con=engine,
                    if_exists="append",
                    index=False,
                    method="multi",
                )

                total_linhas += linhas

                print(
                    f"✅ Chunk {total_chunks:03d} | "
                    f"{linhas:>7,} linhas | "
                    f"Total: {total_linhas:>10,}"
                )

        fim_insert = time.time()

    fim_total = time.time()

    print("\n" + "=" * 60)
    print("🎉 IMPORTAÇÃO CONCLUÍDA")
    print("=" * 60)
    print(f"📊 Total de chunks: {total_chunks}")
    print(f"📄 Total de registros: {total_linhas:,}")
    print(f"⏱ Inserção: {(fim_insert - inicio_insert)/60:.1f} min")
    print(f"⏱ Tempo total: {(fim_total - inicio_total)/60:.1f} min")
    print("=" * 60)


if __name__ == "__main__":
    main()