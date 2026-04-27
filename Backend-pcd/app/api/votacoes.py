from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, Query, HTTPException
from ..database import get_db
from ..models.votacao import Votacao, Voto
from ..services.grafo_service import VotacoesService, GrafoResponse


router = APIRouter(prefix="/votacoes", tags=["Votações"])


@router.get("/")
def list_votacoes(
    page: int = 1,
    limit: int = 20,
    sigla_tipo: str = Query(None),
    db: Session = Depends(get_db)
):

    base_query = db.query(
        Votacao,
        func.count(Voto.id).label("total_votos")
    ).outerjoin(Voto).group_by(Votacao.id)

    total_query = db.query(func.count(Votacao.id))

    if sigla_tipo:
        base_query = base_query.filter(Votacao.sigla_tipo == sigla_tipo)
        total_query = total_query.filter(Votacao.sigla_tipo == sigla_tipo)

    total = total_query.scalar()

    votacoes = base_query\
        .order_by(Votacao.data.desc().nullslast())\
        .offset((page - 1) * limit)\
        .limit(limit)\
        .all()

    data = []
    for v, total_votos in votacoes:
        data.append({
            "id": v.id,
            "descricao": v.descricao,
            "data": v.data,
            "siglaTipo": v.sigla_tipo,
            "totalVotos": total_votos
        })

    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        }
    }


@router.get("/recentes")
def get_recentes(limit: int = 12, db: Session = Depends(get_db)):
    query = db.query(Votacao)
    votacoes = query.order_by(Votacao.data.desc()).limit(limit).all()

    data = []
    for v in votacoes:
        data.append({
            "id": v.id,
            "descricao": v.descricao,
            "data": v.data,
            "siglaTipo": v.sigla_tipo,
            "totalVotos": len(v.votos)
        })
    return {"data": data}


@router.get("/{id}")
def get_votacao(id: str, db: Session = Depends(get_db)):
    votacao = db.query(Votacao).filter(Votacao.id == id).first()
    if not votacao:
        raise HTTPException(status_code=404, detail="Votação não encontrada")

    return {
        "id": votacao.id,
        "descricao": votacao.descricao,
        "data": votacao.data,
        "tipo": votacao.tipo,
        "siglaTipo": votacao.sigla_tipo,
        "uri": votacao.uri,
        "estatisticas": {
            "total": len(votacao.votos),
            "orientacoes": len(votacao.orientacoes)
        }
    }


@router.get("/{id}/votos")
def get_votos_votacao(id: str, page: int = 1, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(Voto).filter(Voto.votacao_id == id)
    total = query.count()
    votos = query.offset((page - 1) * limit).limit(limit).all()

    data = []
    for v in votos:
        data.append({
            "id": v.id,
            "voto": v.voto,
            "seguiuOrientacao": v.seguiu_orientacao,
            "deputado": {
                "id": v.deputado.id,
                "nome": v.deputado.nome,
                "urlFoto": v.deputado.url_foto,
                "partidoid": v.deputado.partido_id
            }
        })

    return {
        "data": data,
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        }
    }


def get_service(db: Session = Depends(get_db)) -> VotacoesService:
    return VotacoesService(db)


@router.get(
    "/{id}/grafo",
    response_model=None,
    summary="Grafo de uma votação",
    description=(
        "Retorna um grafo bipartido **Partido → Deputados** com os votos de "
        "cada parlamentar e a orientação do respectivo partido na votação."
    ),
)
def find_grafo(
    id: str,
    service: VotacoesService = Depends(get_service),
) -> GrafoResponse:
    return service.find_grafo(id)
