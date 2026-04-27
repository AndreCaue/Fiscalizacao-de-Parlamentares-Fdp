import io
import zipfile
import logging
from pathlib import Path

import httpx
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.database import SessionLocal
from app.models.tse_candidato import TSECandidato
from app.services.matching_service import (
    construir_indice_deputados,
    match_candidato
)

logger = logging.getLogger(__name__)


URLS = {
    2022: "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip",
    2026: "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip",
}

CACHE_DIR = Path("data/tse_cache")
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _baixar_zip(ano: int) -> bytes:
    path = CACHE_DIR / f"consulta_cand_{ano}.zip"

    if path.exists():
        logger.info(f"[TSE] Cache: {path}")
        return path.read_bytes()

    url = URLS[ano]
    logger.info(f"[TSE] Baixando {url}")

    with httpx.Client(timeout=120) as client:
        r = client.get(url)
        r.raise_for_status()

    path.write_bytes(r.content)
    return r.content


def _extrair_csv(zip_bytes: bytes) -> pd.DataFrame:
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        csvs = [n for n in zf.namelist() if n.lower().endswith(".csv")]

        if not csvs:
            raise ValueError("Nenhum CSV encontrado no ZIP")

        alvo = max(csvs, key=lambda n: zf.getinfo(n).file_size)
        logger.info(f"[TSE] CSV selecionado: {alvo}")

        with zf.open(alvo) as f:
            df = pd.read_csv(
                f,
                sep=";",
                encoding="latin-1",
                dtype=str,
                low_memory=False,
                on_bad_lines="skip",
            )

    df.columns = [c.strip().upper() for c in df.columns]

    logger.info(f"[TSE] Colunas disponíveis: {list(df.columns)}")
    return df


def _normalizar(df: pd.DataFrame, ano: int) -> pd.DataFrame:
    col_map = {
        "SQ_CANDIDATO": "sq_candidato",
        "NM_CANDIDATO": "nome",
        "NM_URNA_CANDIDATO": "nome_urna",
        "NR_CPF_CANDIDATO": "cpf",
        "SG_UF": "uf",
        "SG_PARTIDO": "partido",
    }

    cols_existentes = {c: v for c, v in col_map.items() if c in df.columns}
    df = df[list(cols_existentes.keys())].rename(columns=cols_existentes)

    if "sq_candidato" not in df.columns:
        raise ValueError("SQ_CANDIDATO não encontrado")

    for col in ["nome", "nome_urna", "cpf", "uf", "partido"]:
        if col not in df.columns:
            df[col] = None

    df["sq_candidato"] = df["sq_candidato"].astype(str).str.strip()
    df["nome"] = df["nome"].fillna("").astype(str).str.strip().str.upper()
    df["nome_urna"] = df["nome_urna"].fillna(
        "").astype(str).str.strip().str.upper()

    if "uf" in df.columns:
        df["uf"] = df["uf"].fillna("").astype(str).str.strip()

    if "partido" in df.columns:
        df["partido"] = df["partido"].fillna(
            "").astype(str).str.strip().str.upper()

    df["ano"] = ano

    return df


def _upsert(db: Session, registros: list[dict]) -> int:
    if not registros:
        return 0

    stmt = sqlite_insert(TSECandidato).values(registros)

    stmt = stmt.on_conflict_do_update(
        index_elements=["sq_candidato"],
        set_={
            "nome": stmt.excluded.nome,
            "nome_urna": stmt.excluded.nome_urna,
            "cpf": stmt.excluded.cpf,
            "ano": stmt.excluded.ano,
            "deputado_id": stmt.excluded.deputado_id,
            "score_match": stmt.excluded.score_match,
            "score_nome": stmt.excluded.score_nome,
            "score_partido": stmt.excluded.score_partido,
            "score_uf": stmt.excluded.score_uf,
        },
    )

    db.execute(stmt)
    db.commit()
    return len(registros)


def ingerir_candidatos_tse(ano: int, db: Session = None):
    if ano not in URLS:
        raise ValueError(f"Ano inválido: {ano}")

    close_db = db is None
    if db is None:
        db = SessionLocal()

    try:
        zip_bytes = _baixar_zip(ano)
        df = _extrair_csv(zip_bytes)
        df = _normalizar(df, ano)

        total = len(df)
        logger.info(f"[TSE {ano}] {total} candidatos carregados")

        indice = construir_indice_deputados(db)
        cache_match = {}

        registros = []

        for _, row in df.iterrows():
            nome = (row["nome"] or "").strip()

            cache_key = f"{nome}_{row.get('uf')}_{row.get('partido')}"

            if cache_key not in cache_match:
                cand = {
                    "nome": nome,
                    "uf": row.get("uf"),
                    "partido": row.get("partido"),
                }
                cache_match[cache_key] = match_candidato(cand, indice)

            match = cache_match[cache_key]

            deputado_id = None
            score_total = None
            score_nome = None
            score_partido = None
            score_uf = None

            if match:
                deputado_id = match["deputado_id"]
                score_total = match["score"]["total"]
                score_nome = match["score"]["nome"]
                score_partido = match["score"]["partido"]
                score_uf = match["score"]["uf"]

                if score_total and score_total > 90:
                    logger.info(
                        f"[MATCH] {nome} → {deputado_id} ({score_total:.1f})")

            registros.append({
                "sq_candidato": row["sq_candidato"],
                "nome": row["nome"],
                "nome_urna": row["nome_urna"],
                "cpf": row["cpf"],
                "ano": row["ano"],

                "deputado_id": deputado_id,
                "score_match": score_total,
                "score_nome": score_nome,
                "score_partido": score_partido,
                "score_uf": score_uf,
            })

        batch_size = 1000
        total_upsert = 0

        for i in range(0, len(registros), batch_size):
            logger.info(f"Total registros montados: {len(registros)}")
            logger.info(
                f"Com deputado_id: {sum(1 for r in registros if r['deputado_id'])}")
            total_upsert += _upsert(db, registros[i:i + batch_size])

        logger.info(f"[TSE {ano}] Upsert concluído: {total_upsert}")

        return {
            "ano": ano,
            "total": total,
            "upsert": total_upsert
        }

    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO)

    parser = argparse.ArgumentParser()
    parser.add_argument("--ano", type=int, required=True)
    args = parser.parse_args()

    print(ingerir_candidatos_tse(args.ano))
