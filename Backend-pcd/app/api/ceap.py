"""
app/api/ceap.py
────────────────
Rotas FastAPI para CEAP e cruzamentos de irregularidade.

Registre no main.py:
    from app.api.ceap import router as ceap_router
    app.include_router(ceap_router, prefix="/api/v1")
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.ingest.ceap import ingerir_ceap, ingerir_ceap_todos
from app.services import ceap_service, irregularidades_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["CEAP & Irregularidades"])


class GastoCategoriaOut(BaseModel):
    tipo_despesa: str
    total: float
    quantidade: int
    media_por_item: float


class GastoFornecedorOut(BaseModel):
    nome_fornecedor: str
    cnpj_cpf: str
    total: float
    quantidade: int


class ResumoCEAPOut(BaseModel):
    deputado_id: str
    ano: int
    total_gasto: float
    total_remuneracao_anual: float
    razao_ceap_salario: float
    por_categoria: list[GastoCategoriaOut]
    top_fornecedores: list[GastoFornecedorOut]


class AlertaOut(BaseModel):
    id: int
    tipo: str
    score_risco: float
    titulo: str
    descricao: str
    valor_ref: Optional[float]
    resolvido: bool

    class Config:
        from_attributes = True


class CruzamentoOut(BaseModel):
    deputado_id: str
    score_global: float
    nivel_risco: str
    alertas: list[dict]
    metricas: dict


class IngestaoOut(BaseModel):
    status: str
    detalhes: Optional[dict] = None


@router.post("/ceap/ingest", response_model=IngestaoOut, summary="Ingerir CEAP (background)")
async def ingerir_ceap_route(
    background_tasks: BackgroundTasks,
    deputado_ids: Optional[list[str]] = Query(
        None, description="IDs específicos (omitir = todos)"),
    anos: list[int] = Query([2023, 2024], description="Anos para ingestão"),
    db: Session = Depends(get_db),
):
    """
    Baixa despesas CEAP e remuneração da API da Câmara.
    Roda em background — retorna imediatamente.
    """
    def _tarefa():
        if deputado_ids:
            ingerir_ceap(deputado_ids, anos)
        else:
            ingerir_ceap_todos(anos)

    background_tasks.add_task(_tarefa)
    return IngestaoOut(
        status="em_andamento",
        detalhes={"anos": anos, "deputados": deputado_ids or "todos"},
    )


@router.get(
    "/ceap/{deputado_id}/resumo",
    response_model=ResumoCEAPOut,
    summary="Resumo CEAP por deputado/ano",
)
def resumo_ceap(
    deputado_id: str,
    ano: int = Query(..., description="Ano de referência"),
    db: Session = Depends(get_db),
):
    resultado = ceap_service.resumo_ceap(db, deputado_id, ano)
    if not resultado:
        raise HTTPException(
            404, f"Sem dados CEAP para deputado_id={deputado_id} ano={ano}")
    return resultado


@router.get(
    "/ceap/{deputado_id}/categorias",
    response_model=list[GastoCategoriaOut],
    summary="Gastos por categoria",
)
def categorias(
    deputado_id: str,
    ano: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    return ceap_service.gastos_por_categoria(db, deputado_id, ano)


@router.get(
    "/ceap/{deputado_id}/fornecedores",
    response_model=list[GastoFornecedorOut],
    summary="Top fornecedores",
)
def fornecedores(
    deputado_id: str,
    ano: Optional[int] = Query(None),
    limite: int = Query(20, le=100),
    db: Session = Depends(get_db),
):
    return ceap_service.gastos_por_fornecedor(db, deputado_id, ano, limite)


@router.get(
    "/ceap/{deputado_id}/mensal",
    response_model=list[dict],
    summary="Evolução mensal de gastos",
)
def mensal(
    deputado_id: str,
    ano: int = Query(...),
    db: Session = Depends(get_db),
):
    return ceap_service.evolucao_mensal(db, deputado_id, ano)


@router.post(
    "/irregularidades/{deputado_id}/analisar",
    response_model=CruzamentoOut,
    summary="Rodar análise de cruzamentos para um deputado",
)
def analisar(
    deputado_id: str,
    anos_ceap: list[int] = Query([2023, 2024]),
    db: Session = Depends(get_db),
):
    """
    Executa todos os checks (patrimônio × CEAP × remuneração) e salva alertas no banco.
    """
    resultado = irregularidades_service.analisar_deputado(
        db, deputado_id, anos_ceap)
    return resultado


@router.get(
    "/irregularidades/{deputado_id}/alertas",
    response_model=list[AlertaOut],
    summary="Alertas salvos para um deputado",
)
def alertas_deputado(
    deputado_id: str,
    db: Session = Depends(get_db),
):
    alertas = irregularidades_service.listar_alertas_deputado(db, deputado_id)
    if not alertas:
        raise HTTPException(404, f"Sem alertas para deputado_id={deputado_id}")
    return alertas


@router.get(
    "/irregularidades/ranking",
    response_model=list[dict],
    summary="Ranking de deputados por score de risco",
)
def ranking(
    limite: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """
    Retorna os deputados com maior score de risco calculado.
    Útil para a tela de visão geral / dashboard de alertas.
    """
    return irregularidades_service.ranking_risco(db, limite)
