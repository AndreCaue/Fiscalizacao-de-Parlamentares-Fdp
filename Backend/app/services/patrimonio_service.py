
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.models.tse_candidato import TSECandidato
from app.models.patrimonio import PatrimonioTSE
from app.models.deputado import Deputado


@dataclass
class BemDTO:
    id: int
    ano_eleicao: int
    tipo: str
    descricao: str
    valor: float
    score_match: Optional[float]


@dataclass
class EvolucaoDTO:
    deputado_id: str
    total_2018: float
    total_2022: float
    variacao_absoluta: float
    variacao_percentual: Optional[float]
    bens_2018: int
    bens_2022: int
    por_tipo: list[dict] = field(default_factory=list)


def _eh_reeleito(db: Session, deputado_id: str) -> bool:
    """
    Verifica se o deputado tem candidatura em 2018 e 2022.
    """
    count = (
        db.query(TSECandidato)
        .filter(
            TSECandidato.deputado_id == deputado_id,
            TSECandidato.ano.in_([2018, 2022]),
        )
        .count()
    )

    return count >= 2


def listar_bens(
    db: Session,
    deputado_id: str,
    ano: Optional[int] = None,
    tipo: Optional[str] = None,
) -> list[BemDTO]:

    q = (
        db.query(PatrimonioTSE)
        .filter(PatrimonioTSE.deputado_id == deputado_id)
        .order_by(PatrimonioTSE.ano_eleicao, PatrimonioTSE.vr_bem_candidato.desc())
    )

    if ano:
        q = q.filter(PatrimonioTSE.ano_eleicao == ano)

    if tipo:
        q = q.filter(PatrimonioTSE.ds_tipo_bem.ilike(f"%{tipo}%"))

    return [
        BemDTO(
            id=b.id,
            ano_eleicao=b.ano_eleicao,
            tipo=b.ds_tipo_bem,
            descricao=b.ds_bem,
            valor=b.vr_bem_candidato,
            score_match=b.score_match,
        )
        for b in q.all()
    ]


def calcular_evolucao(db: Session, deputado_id: str) -> Optional[EvolucaoDTO]:
    """
    Evolução 2018 → 2022 (somente reeleitos)
    """

    if not _eh_reeleito(db, deputado_id):
        return None

    rows = (
        db.query(
            PatrimonioTSE.ano_eleicao,
            func.sum(PatrimonioTSE.vr_bem_candidato).label("total"),
            func.count(PatrimonioTSE.id).label("qtd"),
        )
        .filter(PatrimonioTSE.deputado_id == deputado_id)
        .group_by(PatrimonioTSE.ano_eleicao)
        .all()
    )

    if not rows:
        return None

    por_ano = {
        r.ano_eleicao: {"total": r.total or 0.0, "qtd": r.qtd}
        for r in rows
    }

    total_2018 = por_ano.get(2018, {}).get("total", 0.0)
    total_2022 = por_ano.get(2022, {}).get("total", 0.0)

    qtd_2018 = por_ano.get(2018, {}).get("qtd", 0)
    qtd_2022 = por_ano.get(2022, {}).get("qtd", 0)

    variacao_abs = total_2022 - total_2018

    variacao_pct = (
        (variacao_abs / total_2018 * 100) if total_2018 > 0 else None
    )

    tipo_rows = (
        db.query(
            PatrimonioTSE.ds_tipo_bem,
            func.sum(
                case(
                    (PatrimonioTSE.ano_eleicao == 2018,
                     PatrimonioTSE.vr_bem_candidato),
                    else_=0,
                )
            ).label("valor_2018"),
            func.sum(
                case(
                    (PatrimonioTSE.ano_eleicao == 2022,
                     PatrimonioTSE.vr_bem_candidato),
                    else_=0,
                )
            ).label("valor_2022"),
        )
        .filter(PatrimonioTSE.deputado_id == deputado_id)
        .group_by(PatrimonioTSE.ds_tipo_bem)
        .order_by(func.sum(PatrimonioTSE.vr_bem_candidato).desc())
        .all()
    )

    por_tipo = [
        {
            "tipo": r.ds_tipo_bem,
            "valor_2018": float(r.valor_2018 or 0),
            "valor_2022": float(r.valor_2022 or 0),
            "variacao": float((r.valor_2022 or 0) - (r.valor_2018 or 0)),
        }
        for r in tipo_rows
    ]

    return EvolucaoDTO(
        deputado_id=deputado_id,
        total_2018=total_2018,
        total_2022=total_2022,
        variacao_absoluta=variacao_abs,
        variacao_percentual=variacao_pct,
        bens_2018=qtd_2018,
        bens_2022=qtd_2022,
        por_tipo=por_tipo,
    )


def resumo_patrimonio(db: Session, deputado_id: str) -> dict:

    evolucao = calcular_evolucao(db, deputado_id)

    if not evolucao:
        return {"deputado_id": deputado_id, "dados_disponiveis": False}

    return {
        "deputado_id": deputado_id,
        "dados_disponiveis": True,
        "ano_referencia": 2022,
        "total_declarado": evolucao.total_2022,
        "variacao_pct": evolucao.variacao_percentual,
        "variacao_abs": evolucao.variacao_absoluta,
        "tem_evolucao": evolucao.total_2018 > 0,
    }


def top_variacao(db: Session, limit: int = 10):
    """
    Ranking de crescimento patrimonial (somente reeleitos)
    """

    sub = (
        db.query(
            PatrimonioTSE.deputado_id,
            PatrimonioTSE.ano_eleicao,
            func.sum(PatrimonioTSE.vr_bem_candidato).label("total"),
        )
        .filter(PatrimonioTSE.deputado_id != None)
        .group_by(PatrimonioTSE.deputado_id, PatrimonioTSE.ano_eleicao)
        .subquery()
    )

    p18 = db.query(sub).filter(sub.c.ano_eleicao == 2018).subquery()
    p22 = db.query(sub).filter(sub.c.ano_eleicao == 2022).subquery()

    query = (
        db.query(
            Deputado.id,
            Deputado.nome,
            p18.c.total.label("pat_2018"),
            p22.c.total.label("pat_2022"),
            (p22.c.total - p18.c.total).label("variacao"),
        )
        .join(p18, p18.c.deputado_id == Deputado.id)
        .join(p22, p22.c.deputado_id == Deputado.id)
        .order_by((p22.c.total - p18.c.total).desc())
        .limit(limit)
    )

    resultados = []

    for r in query.all():

        if not _eh_reeleito(db, r.id):
            continue

        percentual = None

        if r.pat_2018 and r.pat_2018 > 0:
            percentual = ((r.pat_2022 - r.pat_2018) / r.pat_2018) * 100

        resultados.append({
            "deputado_id": r.id,
            "nome": r.nome,
            "patrimonio_2018": float(r.pat_2018 or 0),
            "patrimonio_2022": float(r.pat_2022 or 0),
            "variacao": float(r.variacao or 0),
            "percentual": round(percentual, 2) if percentual else None,
        })

    return resultados


def calcular_score_risco(variacao_abs: float, variacao_pct: Optional[float]) -> tuple[float, str]:
    """
    Retorna (score, nivel)
    """

    score = 0.0

    if variacao_abs > 1_000_000:
        score += 0.5
    elif variacao_abs > 500_000:
        score += 0.3

    if variacao_pct:
        if variacao_pct > 300:
            score += 0.5
        elif variacao_pct > 100:
            score += 0.3

    score = min(score, 1.0)

    if score >= 0.7:
        nivel = "ALTO"
    elif score >= 0.4:
        nivel = "MEDIO"
    else:
        nivel = "BAIXO"

    return score, nivel


def gerar_alertas(db: Session, limit: int = 20):
    """
    Gera ranking de possíveis enriquecimentos suspeitos
    """

    top = top_variacao(db, limit=100)

    alertas = []

    for r in top:
        score, nivel = calcular_score_risco(
            r["variacao"],
            r["percentual"]
        )

        if nivel == "BAIXO":
            continue

        motivo = []

        if r["variacao"] > 1_000_000:
            motivo.append("alto crescimento absoluto")

        if r["percentual"] and r["percentual"] > 300:
            motivo.append("alto crescimento percentual")

        alertas.append({
            "deputado_id": r["deputado_id"],
            "nome": r["nome"],
            "variacao_abs": r["variacao"],
            "variacao_pct": r["percentual"],
            "score_risco": round(score, 2),
            "nivel": nivel,
            "motivo": ", ".join(motivo)
        })

    return sorted(alertas, key=lambda x: x["score_risco"], reverse=True)[:limit]
