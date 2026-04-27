from rapidfuzz import fuzz
from app.models.deputado import Deputado


def construir_indice_deputados(db):
    deputados = db.query(Deputado).all()

    indice = []
    for d in deputados:
        indice.append({
            "id": d.id,
            "nome": (d.nome or "").upper(),
            "uf": d.estado,
            "partido": d.partido.sigla if d.partido else None
        })

    return indice


def calcular_score(cand, dep):
    score_nome = fuzz.token_sort_ratio(cand["nome"], dep["nome"])

    score_partido = 0
    if cand["partido"] and dep["partido"]:
        if cand["partido"] == dep["partido"]:
            score_partido = 100

    score_uf = 0
    if cand["uf"] and dep["uf"]:
        if cand["uf"] == dep["uf"]:
            score_uf = 100

    score_total = (
        score_nome * 0.7 +
        score_partido * 0.2 +
        score_uf * 0.1
    )

    return {
        "total": score_total,
        "nome": score_nome,
        "partido": score_partido,
        "uf": score_uf
    }


def match_candidato(cand, deputados, threshold=80):
    melhor = None
    melhor_score = 0

    for dep in deputados:
        score = calcular_score(cand, dep)

        if score["total"] > melhor_score:
            melhor_score = score["total"]
            melhor = (dep, score)

    if melhor and melhor_score >= threshold:
        return {
            "deputado_id": melhor[0]["id"],
            "score": melhor[1]
        }

    return None
