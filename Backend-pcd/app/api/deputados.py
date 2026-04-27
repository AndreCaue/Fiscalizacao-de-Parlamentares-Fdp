from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, Query, HTTPException
from ..database import get_db
from ..models.deputado import Deputado
from ..models.partido import Partido
from ..models.votacao import Voto, Votacao
from ..services.relacao_service import RelacaoService

router = APIRouter(prefix="/deputados", tags=["Deputados"])


@router.get("")
def list_deputados(
    partido: str = None,
    estado: str = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Deputado)
    if estado:
        query = query.filter(Deputado.estado == estado.upper())
    if partido:
        query = query.join(Partido).filter(Partido.sigla == partido.upper())

    total = query.count()
    deputados = query.order_by(Deputado.nome).offset(
        (page - 1) * limit).limit(limit).all()

    return {
        "data": deputados,
        "meta": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        }
    }


@router.get("/{id}")
def get_deputado(id: str, db: Session = Depends(get_db)):
    deputado = db.query(Deputado).filter(Deputado.id == id).first()
    if not deputado:
        raise HTTPException(status_code=404, detail="Deputado não encontrado")
    return deputado


@router.get("/{id}/relacoes")
def get_relacoes(id: str, db: Session = Depends(get_db)):
    service = RelacaoService(db)
    rels = service.get_relacoes_com_detalhes(id)
    if not rels:
        service.gerar_relacoes_deputado(id)
        rels = service.get_relacoes_com_detalhes(id)
    return rels


@router.get("/{id}/votos")
def get_votos_deputado(
    id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    db: Session = Depends(get_db)
):
    query = db.query(Voto).join(Votacao).filter(Voto.deputado_id == id)
    total = query.count()

    votos = query.order_by(Votacao.data.desc())\
        .offset((page - 1) * limit)\
        .limit(limit)\
        .all()

    data = []
    for v in votos:
        data.append({
            "id": str(v.id),
            "voto": v.voto,
            "votacaoId": v.votacao_id,
            "votacao": {
                "id": v.votacao.id,
                "descricao": v.votacao.descricao,
                "data": v.votacao.data.isoformat() if v.votacao.data else None
            }
        })

    return {
        "data": data,
        "meta": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": (total + limit - 1) // limit if total > 0 else 0
        }
    }


@router.get("/{id}/estatisticas")
def get_estatisticas_deputado(id: str, db: Session = Depends(get_db)):
    votos_query = db.query(Voto.voto).filter(Voto.deputado_id == id).all()

    total = len(votos_query)
    if total == 0:
        return {
            "total": 0,
            "porTipo": {},
            "percentuais": {}
        }

    por_tipo = {}
    for (tipo,) in votos_query:
        por_tipo[tipo] = por_tipo.get(tipo, 0) + 1

    percentuais = {}
    for tipo, qtd in por_tipo.items():
        percentuais[tipo] = round((qtd / total) * 100, 2)

    return {
        "total": total,
        "porTipo": por_tipo,
        "percentuais": percentuais
    }
