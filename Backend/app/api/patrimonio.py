"""
app/api/patrimonio.py
──────────────────────
Rotas FastAPI para patrimônio TSE.

Registre no main.py:
    from app.api.patrimonio import router as patrimonio_router
    app.include_router(patrimonio_router, prefix="/api/v1")
"""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.ingest.tse_patrimonio import ingerir_patrimonio_tse
from app.services import patrimonio_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patrimonio", tags=["Patrimônio TSE"])


class BemOut(BaseModel):
    id: int
    ano_eleicao: int
    tipo: str
    descricao: str
    valor: float
    score_match: Optional[float]

    class Config:
        from_attributes = True


class EvolucaoOut(BaseModel):
    deputado_id: str
    total_2022: float
    total_2026: float
    variacao_absoluta: float
    variacao_percentual: Optional[float]
    bens_2022: int
    bens_2026: int
    por_tipo: list[dict]


class IngestaoOut(BaseModel):
    status: str
    ano: int
    detalhes: Optional[dict] = None


@router.get("/top-variacao", summary="Ranking de variação patrimonial")
def top_variacao(
    limit: int = Query(10, description="Quantidade de deputados"),
    db: Session = Depends(get_db),
):
    """
    Retorna os deputados com maior crescimento patrimonial
    entre 2022 e 2026.
    """

    return patrimonio_service.top_variacao(db, limit)


@router.post("/ingest/{ano}", response_model=IngestaoOut, summary="Disparar ingestão TSE")
async def ingerir(
    ano: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Baixa o ZIP do TSE para o ano informado (2022 ou 2026),
    parseia o CSV e salva no banco via upsert.

    A ingestão roda em background — a rota retorna imediatamente.
    Acompanhe os logs do servidor para progresso.
    """
    if ano not in (2018, 2022):
        raise HTTPException(
            status_code=400, detail="Ano deve ser 2022 ou 2026.")

    def _tarefa():
        stats = ingerir_patrimonio_tse(ano)
        logger.info(f"[BG] Ingestão TSE {ano} finalizada: {stats}")

    background_tasks.add_task(_tarefa)

    return IngestaoOut(
        status="em_andamento",
        ano=ano,
        detalhes={
            "mensagem": "Ingestão iniciada em background. Verifique os logs."},
    )


@router.post("/ingest/{ano}/sync", response_model=IngestaoOut, summary="Ingestão síncrona (dev)")
def ingerir_sync(
    ano: int,
    db: Session = Depends(get_db),
):
    """
    Versão síncrona da ingestão — útil para testes locais.
    Pode demorar vários minutos dependendo do tamanho do CSV.
    """
    if ano not in (2022, 2026):
        raise HTTPException(
            status_code=400, detail="Ano deve ser 2022 ou 2026.")

    stats = ingerir_patrimonio_tse(ano, db=db)
    return IngestaoOut(status="concluido", ano=ano, detalhes=stats)


@router.get("/alertas", summary="Possíveis enriquecimentos suspeitos")
def alertas(
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return patrimonio_service.gerar_alertas(db, limit)


@router.get("/{deputado_id}", response_model=list[BemOut], summary="Bens de um deputado")
def listar_bens(
    deputado_id: str,
    ano: Optional[int] = Query(
        None, description="Filtrar por ano (2022 ou 2026)"),
    tipo: Optional[str] = Query(
        None, description="Filtrar por tipo de bem (parcial)"),
    db: Session = Depends(get_db),
):
    """
    Retorna a lista de bens declarados ao TSE para o deputado.
    Aceita filtros opcionais por `ano` e `tipo` (substring).
    """
    bens = patrimonio_service.listar_bens(db, deputado_id, ano=ano, tipo=tipo)
    if not bens:
        raise HTTPException(
            status_code=404,
            detail=f"Nenhum bem encontrado para deputado_id={deputado_id}.",
        )
    return bens


@router.get("/{deputado_id}/evolucao", response_model=EvolucaoOut, summary="Evolução 2022→2026")
def evolucao(
    deputado_id: str,
    db: Session = Depends(get_db),
):
    """
    Compara o patrimônio total declarado entre 2022 e 2026,
    com breakdown por tipo de bem.
    """
    resultado = patrimonio_service.calcular_evolucao(db, deputado_id)
    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail=f"Sem dados de evolução para deputado_id={deputado_id}.",
        )
    return resultado


@router.get("/{deputado_id}/resumo", summary="Resumo rápido para cards")
def resumo(
    deputado_id: str,
    db: Session = Depends(get_db),
):
    """
    Retorno enxuto para uso em cards de dashboard:
    total atual, variação percentual e flags de alerta.
    """
    return patrimonio_service.resumo_patrimonio(db, deputado_id)

"""```
FEATURE.
🟡 CEAP (gastos)
deputado gasta muito + patrimônio cresce muito = 🚨
🟡 salário público
crescimento incompatível com renda
🟡 bens suspeitos
muitos imóveis novos
mudança de padrão (carro → fazenda)
```"""
