from app.models.tse_candidato import TSECandidato
from sqlalchemy.orm import Session


def get_deputados_reeleitos(db: Session):

    sub_2018 = db.query(TSECandidato.deputado_id).filter(
        TSECandidato.ano == 2018,
        TSECandidato.deputado_id != None
    )

    sub_2022 = db.query(TSECandidato.deputado_id).filter(
        TSECandidato.ano == 2022,
        TSECandidato.deputado_id != None
    )

    reeleitos = set(r[0] for r in sub_2018.all()) & set(r[0]
                                                        for r in sub_2022.all())

    return reeleitos
