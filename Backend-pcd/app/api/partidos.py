from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query, HTTPException
from ..database import get_db
from ..models.partido import Partido

router = APIRouter(prefix="/partidos", tags=["Partidos"])

@router.get("")
def list_partidos(db: Session = Depends(get_db)):
    return db.query(Partido).order_by(Partido.sigla).all()

@router.get("/{id}")
def get_partido(id: str, db: Session = Depends(get_db)):
    partido = db.query(Partido).filter(Partido.id == id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido não encontrado")
    return partido
