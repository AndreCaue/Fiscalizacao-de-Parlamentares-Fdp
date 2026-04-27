from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.votacao import Votacao

router = APIRouter(prefix="/lookups", tags=["Lookups"])


@router.get("/tipos-comissoes")
def get_tipos_votacao(db: Session = Depends(get_db)):
    tipos = (
        db.query(Votacao.sigla_tipo)
        .filter(Votacao.sigla_tipo != None)
        .distinct()
        .order_by(Votacao.sigla_tipo)
        .all()
    )

    return [sigla for (sigla,) in tipos]
