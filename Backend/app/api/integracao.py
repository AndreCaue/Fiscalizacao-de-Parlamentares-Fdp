from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from ..database import get_db
from ..services.integracao_service import IntegracaoService
from ..models.votacao import SyncLog
from datetime import datetime

router = APIRouter(prefix="/integracao", tags=["Integração"])


@router.post("/sync")
async def sync_data(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    service = IntegracaoService(db)
    background_tasks.add_task(service.sync_full)
    return {"message": "Sincronização iniciada em segundo plano"}


@router.post("/sync/completo")
async def sync_completo(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    service = IntegracaoService(db)
    background_tasks.add_task(service.sync_full, data_inicio="2023-01-01")
    return {"message": "Sincronização completa iniciada em segundo plano"}


@router.get("/logs")
def get_logs(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(SyncLog).order_by(SyncLog.criado_em.desc()).limit(limit).all()


@router.post("/sync/historico")
async def sync_historico(
    background_tasks: BackgroundTasks,
    data_inicio: str = "2021-01-01",
    data_fim: str = None,
    db: Session = Depends(get_db)
):
    service = IntegracaoService(db)
    background_tasks.add_task(
        service.sync_full_historico,
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    total_periodos = len(IntegracaoService.gerar_periodos(
        data_inicio, data_fim or datetime.now().strftime("%Y-%m-%d")
    ))
    return {
        "message": f"Sincronização histórica iniciada: {total_periodos} períodos de 3 meses",
        "data_inicio": data_inicio,
        "data_fim": data_fim or "hoje"
    }
