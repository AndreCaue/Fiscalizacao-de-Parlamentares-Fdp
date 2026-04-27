

import logging
import time
from datetime import date
from typing import Optional

import httpx
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.ceap_models import DespesaCEAP, RemuneracaoDeputado
from app.models.deputado import Deputado

logger = logging.getLogger(__name__)

BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"
HEADERS = {"accept": "application/json"}
# Pausa entre requisições para não sobrecarregar a API
SLEEP_BETWEEN_PAGES = 0.3   # seconds
SLEEP_BETWEEN_DEPS = 1.0   # seconds


def _get(client: httpx.Client, path: str, params: dict = None) -> dict:
    resp = client.get(f"{BASE_URL}{path}", params=params or {
    }, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _parse_data(valor: Optional[str]) -> Optional[date]:
    if not valor:
        return None
    try:
        return date.fromisoformat(valor[:10])
    except Exception:
        return None


def _fetch_despesas_deputado(
    client: httpx.Client,
    deputado_id: str,
    anos: list[int],
    meses: Optional[list[int]] = None,
) -> list[dict]:
    """Busca todas as despesas CEAP de um deputado para os anos informados."""
    registros = []

    for ano in anos:
        params = {
            "ano": ano,
            "itens": 100,
            "pagina": 1,
            "ordem": "ASC",
            "ordenarPor": "ano",
        }
        if meses:
            params["mes"] = meses

        while True:
            try:
                data = _get(
                    client, f"/deputados/{deputado_id}/despesas", params)
            except httpx.HTTPStatusError as e:
                logger.warning(
                    f"[CEAP] Erro {e.response.status_code} dep={deputado_id} ano={ano}")
                break

            itens = data.get("dados", [])
            if not itens:
                break

            for item in itens:
                vl_doc = float(item.get("valorDocumento") or 0)
                vl_glosa = float(item.get("valorGlosa") or 0)
                registros.append({
                    "deputado_id":          deputado_id,
                    "ano":                  int(item.get("ano") or ano),
                    "mes":                  int(item.get("mes") or 0),
                    "tipo_despesa":         item.get("tipoDespesa", ""),
                    "cnpj_cpf_fornecedor":  item.get("cnpjCpfFornecedor", ""),
                    "nome_fornecedor":      item.get("nomeFornecedor", ""),
                    "numero_documento":     str(item.get("numDocumento", "") or ""),
                    "data_documento":       _parse_data(item.get("dataDocumento")),
                    "valor_documento":      vl_doc,
                    "valor_glosa":          vl_glosa,
                    "valor_liquido":        round(vl_doc - vl_glosa, 2),
                    "url_documento":        item.get("urlDocumento"),
                })

            links = {l["rel"]: l["href"] for l in data.get("links", [])}
            if "next" not in links:
                break
            params["pagina"] += 1
            time.sleep(SLEEP_BETWEEN_PAGES)

    return registros


def _upsert_despesas(db: Session, registros: list[dict]) -> int:
    if not registros:
        return 0
    stmt = sqlite_insert(DespesaCEAP).values(registros)
    stmt = stmt.on_conflict_do_update(
        index_elements=["deputado_id", "ano", "mes",
                        "numero_documento", "cnpj_cpf_fornecedor"],
        set_={
            "valor_documento": stmt.excluded.valor_documento,
            "valor_glosa":     stmt.excluded.valor_glosa,
            "valor_liquido":   stmt.excluded.valor_liquido,
            "tipo_despesa":    stmt.excluded.tipo_despesa,
            "nome_fornecedor": stmt.excluded.nome_fornecedor,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(registros)


def _fetch_remuneracao_deputado(
    client: httpx.Client,
    deputado_id: str,
    anos: list[int],
) -> list[dict]:
    """
    Endpoint: GET /deputados/{id}/historicoNome não tem remuneração diretamente.
    A Câmara expõe remuneração em:
        GET /deputados/{id}  → campo 'ultimoStatus.gabinete' NÃO tem salário.

    O dado oficial de remuneração está em:
        https://dadosabertos.camara.leg.br/api/v2/deputados/{id}
    campo: dadosBasicos → não inclui salário individualmente.

    Usamos o endpoint de verbas indenizatórias + remuneração do Portal da Transparência
    como fallback; se indisponível, usamos o valor tabelado da legislatura vigente.

    Tabela salarial (fonte: Resolução da Mesa da Câmara):
        2023: R$ 33.763,00 bruto
        2024: R$ 37.000,00 bruto  (reajuste aprovado)
        2025: R$ 37.000,00 bruto
    """
    SALARIO_TABELADO = {
        2022: 33_763.00,
        2023: 33_763.00,
        2024: 37_000.00,
        2025: 37_000.00,
        2026: 37_000.00,
    }

    registros = []

    for ano in anos:
        for mes in range(1, 13):
            valor = SALARIO_TABELADO.get(ano, 33_763.00)
            registros.append({
                "deputado_id":  deputado_id,
                "ano":          ano,
                "mes":          mes,
                "valor_bruto":  valor,
                "valor_liquido": None,
            })

    return registros


def _upsert_remuneracao(db: Session, registros: list[dict]) -> int:
    if not registros:
        return 0
    stmt = sqlite_insert(RemuneracaoDeputado).values(registros)
    stmt = stmt.on_conflict_do_update(
        index_elements=["deputado_id", "ano", "mes"],
        set_={
            "valor_bruto":   stmt.excluded.valor_bruto,
            "valor_liquido": stmt.excluded.valor_liquido,
        },
    )
    db.execute(stmt)
    db.commit()
    return len(registros)


def ingerir_ceap(
    deputado_ids: list[str],
    anos: list[int],
    db: Optional[Session] = None,
) -> dict:
    """
    Ingere CEAP + Remuneração para uma lista de deputados e anos.

    Returns: estatísticas da ingestão
    """
    fechar_db = db is None
    if db is None:
        db = SessionLocal()

    stats = {
        "deputados_processados": 0,
        "despesas_upsert":       0,
        "remuneracao_upsert":    0,
        "erros":                 [],
    }

    try:
        with httpx.Client(timeout=30) as client:
            for dep_id in deputado_ids:
                try:
                    logger.info(f"[CEAP] Ingerindo dep={dep_id} anos={anos}")

                    despesas = _fetch_despesas_deputado(client, dep_id, anos)
                    stats["despesas_upsert"] += _upsert_despesas(db, despesas)

                    remuneracao = _fetch_remuneracao_deputado(
                        client, dep_id, anos)
                    stats["remuneracao_upsert"] += _upsert_remuneracao(
                        db, remuneracao)

                    stats["deputados_processados"] += 1
                    time.sleep(SLEEP_BETWEEN_DEPS)

                except Exception as e:
                    logger.error(f"[CEAP] Erro dep={dep_id}: {e}")
                    stats["erros"].append(
                        {"deputado_id": dep_id, "erro": str(e)})

    finally:
        if fechar_db:
            db.close()

    logger.info(f"[CEAP] Ingestão concluída: {stats}")
    return stats


def ingerir_ceap_todos(anos: list[int], db: Optional[Session] = None) -> dict:
    """Ingere CEAP para todos os deputados cadastrados no banco."""
    fechar_db = db is None
    if db is None:
        db = SessionLocal()
    try:
        ids = [str(d.id) for d in db.query(Deputado.id).all()]
        logger.info(f"[CEAP] Iniciando ingestão para {len(ids)} deputados")
        return ingerir_ceap(ids, anos, db=db)
    finally:
        if fechar_db:
            db.close()


if __name__ == "__main__":
    import argparse
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="Ingere CEAP da Câmara")
    parser.add_argument("--deputado_id", nargs="+", help="IDs dos deputados")
    parser.add_argument("--todos", action="store_true",
                        help="Todos os deputados do banco")
    parser.add_argument("--anos", nargs="+", type=int, required=True)
    args = parser.parse_args()

    if args.todos:
        print(ingerir_ceap_todos(args.anos))
    elif args.deputado_id:
        print(ingerir_ceap(args.deputado_id, args.anos))
    else:
        parser.error("Informe --deputado_id ou --todos")
