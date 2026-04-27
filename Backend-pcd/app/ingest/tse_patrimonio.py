"""
app/ingest/tse_patrimonio.py
────────────────────────────
Baixa o ZIP de Bens de Candidatos do TSE, parseia o CSV e salva
no banco cruzando com a tabela de deputados via fuzzy match de nome.

Uso rápido (linha de comando):
    python -m app.ingest.tse_patrimonio --ano 2022
    python -m app.ingest.tse_patrimonio --ano 2026
"""

import io
import logging
import zipfile
from pathlib import Path
from typing import Optional

import httpx
import pandas as pd
from rapidfuzz import fuzz, process
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.deputado import Deputado
from app.models.patrimonio import PatrimonioTSE

logger = logging.getLogger(__name__)


TSE_URLS: dict[int, str] = {
    2018: "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2018.zip",
    2022: "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip",
    # 2026: "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip",
}

CACHE_DIR = Path("data/tse_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

TSE_COLS = {
    "SQ_CANDIDATO":      "sq_candidato",
    "NR_ORDEM_BEM":      "nr_ordem_bem",
    "DS_TIPO_BEM":       "ds_tipo_bem",
    "DS_BEM":            "ds_bem",
    "VR_BEM_CANDIDATO":  "vr_bem_candidato",
}

FUZZY_THRESHOLD = 82


def _baixar_zip(ano: int) -> bytes:
    """Baixa o ZIP do TSE com cache local."""
    cache_path = CACHE_DIR / f"bem_candidato_{ano}.zip"

    if cache_path.exists():
        logger.info(f"[TSE] Usando cache: {cache_path}")
        return cache_path.read_bytes()

    url = TSE_URLS[ano]
    logger.info(f"[TSE] Baixando {url} ...")
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        resp = client.get(url)
        resp.raise_for_status()

    cache_path.write_bytes(resp.content)
    logger.info(f"[TSE] Salvo em cache: {cache_path}")
    return resp.content


def _extrair_csv(zip_bytes: bytes, ano: int) -> pd.DataFrame:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        csvs = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csvs:
            raise ValueError(f"Nenhum CSV encontrado no ZIP do TSE {ano}")

        alvo = next(
            (n for n in csvs if "BRASIL" in n.upper()),
            max(csvs, key=lambda n: zf.getinfo(n).file_size),
        )
        logger.info(f"[TSE] Lendo arquivo interno: {alvo}")

        with zf.open(alvo) as f:
            df = pd.read_csv(
                f,
                sep=";",
                encoding="latin-1",
                dtype=str,
                on_bad_lines="skip",
                low_memory=False,
            )

    df.columns = [c.strip().upper() for c in df.columns]

    logger.warning(f"[TSE {ano}] Colunas disponíveis: {list(df.columns)}")

    col_map = {
        "SQ_CANDIDATO": "sq_candidato",

        "NR_ORDEM_BEM_CANDIDATO": "nr_ordem_bem",
        "DS_TIPO_BEM_CANDIDATO": "ds_tipo_bem",
        "DS_BEM_CANDIDATO": "ds_bem",

        "VR_BEM_CANDIDATO": "vr_bem_candidato",
    }

    cols_existentes = {c: col_map[c] for c in col_map if c in df.columns}

    df = df[list(cols_existentes.keys())].rename(columns=cols_existentes)

    obrigatorias = [
        "sq_candidato",
        "nr_ordem_bem",
        "vr_bem_candidato",
    ]

    for col in obrigatorias:
        if col not in df.columns:
            logger.warning(f"[TSE {ano}] Coluna ausente: {col}")
            df[col] = None

    df["sq_candidato"] = (
        df["sq_candidato"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    df["vr_bem_candidato"] = (
        df["vr_bem_candidato"]
        .fillna("0")
        .astype(str)
        .str.replace(",", ".", regex=False)
        .pipe(pd.to_numeric, errors="coerce")
        .fillna(0.0)
    )

    df["nr_ordem_bem"] = (
        pd.to_numeric(df["nr_ordem_bem"], errors="coerce")
        .fillna(0)
        .astype(int)
    )

    for col in ["ds_tipo_bem", "ds_bem"]:
        if col in df.columns:
            df[col] = df[col].fillna("")
        else:
            df[col] = ""

    return df


def _construir_indice_deputados(db: Session) -> dict[str, str]:
    """
    Retorna {NOME_UPPER: deputado_id} para todos os deputados do banco.
    """
    deputados = db.query(Deputado.id, Deputado.nome).all()
    return {d.nome.strip().upper(): d.id for d in deputados}


def _match_nome(
    nome_tse: str,
    indice: dict[str, str],
    threshold: int = FUZZY_THRESHOLD,
) -> tuple[Optional[str], Optional[float]]:
    """
    Retorna (deputado_id, score) ou (None, None) se não atingir o threshold.
    Usa token_sort_ratio para lidar com inversão de nomes.
    """
    nomes = list(indice.keys())
    resultado = process.extractOne(
        nome_tse,
        nomes,
        scorer=fuzz.token_sort_ratio,
        score_cutoff=threshold,
    )
    if resultado is None:
        return None, None

    nome_match, score, _ = resultado
    return indice[nome_match], float(score)


def _upsert_patrimonio(db: Session, registros: list[dict]) -> int:
    """
    Faz upsert usando a constraint única (sq_candidato, ano_eleicao, nr_ordem_bem).
    Retorna o número de linhas processadas.
    """
    if not registros:
        return 0

    stmt = sqlite_insert(PatrimonioTSE).values(registros)
    stmt = stmt.on_conflict_do_update(
        index_elements=["sq_candidato", "ano_eleicao", "nr_ordem_bem"],
        set_={
            "deputado_id":       stmt.excluded.deputado_id,
            "ds_tipo_bem":       stmt.excluded.ds_tipo_bem,
            "ds_bem":            stmt.excluded.ds_bem,
            "vr_bem_candidato":  stmt.excluded.vr_bem_candidato,
            "score_match":       stmt.excluded.score_match,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(registros)


def ingerir_patrimonio_tse(ano: int, db: Optional[Session] = None) -> dict:
    """
    Pipeline completo: download → parse → match → upsert.

    Args:
        ano: 2022 ou 2026
        db:  Session SQLAlchemy (se None, cria e fecha internamente)

    Returns:
        dict com estatísticas da ingestão
    """
    if ano not in TSE_URLS:
        raise ValueError(
            f"Ano {ano} não suportado. Use: {list(TSE_URLS.keys())}")

    fechar_db = db is None
    if db is None:
        db = SessionLocal()

    try:
        zip_bytes = _baixar_zip(ano)
        df = _extrair_csv(zip_bytes, ano)
        total_csv = len(df)
        logger.info(f"[TSE {ano}] {total_csv} bens carregados do CSV")

        indice = _construir_indice_deputados(db)
        logger.info(f"[TSE] {len(indice)} deputados no índice de match")

        cache_match: dict[str, tuple] = {}
        registros: list[dict] = []
        sem_match = 0

        for _, row in df.iterrows():
            nome = row.get("nome_candidato", "")

            if not nome:
                continue

            if nome not in cache_match:
                cache_match[nome] = _match_nome(nome, indice)

            dep_id, score = cache_match[nome]
            if dep_id is None:
                sem_match += 1

            registros.append({
                "deputado_id":       dep_id,
                "sq_candidato":      row["sq_candidato"],
                "nome_candidato":    row["nome_candidato"],
                "ano_eleicao":       ano,
                "nr_ordem_bem":      int(row["nr_ordem_bem"]),
                "ds_tipo_bem":       row.get("ds_tipo_bem", ""),
                "ds_bem":            row.get("ds_bem", ""),
                "vr_bem_candidato":  float(row["vr_bem_candidato"]),
                "score_match":       score,
            })

        total_upsert = 0
        batch_size = 500
        for i in range(0, len(registros), batch_size):
            logger.info(f"Total registros montados: {len(registros)}")
            logger.info(
                f"Com deputado_id: {sum(1 for r in registros if r['deputado_id'])}")
            total_upsert += _upsert_patrimonio(db,
                                               registros[i: i + batch_size])

        stats = {
            "ano":           ano,
            "total_csv":     total_csv,
            "total_upsert":  total_upsert,
            "com_match":     total_upsert - sem_match,
            "sem_match":     sem_match,
            "deputados_idx": len(indice),
        }
        logger.info(f"[TSE {ano}] Ingestão concluída: {stats}")
        return stats

    finally:
        if fechar_db:
            db.close()


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="Ingere patrimônio TSE")
    parser.add_argument("--ano", type=int, required=True, choices=[2022, 2026])
    args = parser.parse_args()

    resultado = ingerir_patrimonio_tse(args.ano)
    print(resultado)
