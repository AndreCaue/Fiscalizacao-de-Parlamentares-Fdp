from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query
from ..database import get_db
from ..services.stats_service import StatsService

router = APIRouter(prefix="/stats", tags=["Estatísticas"])


@router.get("/resumo")
def get_resumo(db: Session = Depends(get_db)):
    return StatsService(db).get_resumo()


@router.get("/votos-distribuicao")
def get_votos_dist(db: Session = Depends(get_db)):
    return StatsService(db).get_distribuicao_votos()


@router.get("/disciplina-partidos")
def get_disciplina(db: Session = Depends(get_db)):
    return StatsService(db).get_disciplina_partidos()


@router.get("/deputados-rebeldes")
def get_rebeldes(db: Session = Depends(get_db)):
    return StatsService(db).get_deputados_rebeldes()


@router.get("/votacoes-destaque")
def get_votacoes_destaque(limit: int = 5, db: Session = Depends(get_db)):
    return StatsService(db).get_votacoes_destaque(limit=limit)


@router.get("/busca")
def search_deputados(nome: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    return StatsService(db).search_deputados(nome)
