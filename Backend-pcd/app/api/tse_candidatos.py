
from fastapi import APIRouter, BackgroundTasks
from app.ingest.tse_candidatos import ingerir_candidatos_tse

router = APIRouter(prefix="/tse/candidatos", tags=["TSE"])


@router.post("/ingest/{ano}")
def ingest(ano: int, bg: BackgroundTasks):
    bg.add_task(ingerir_candidatos_tse, ano)
    return {"msg": f"Ingest {ano} iniciado"}
