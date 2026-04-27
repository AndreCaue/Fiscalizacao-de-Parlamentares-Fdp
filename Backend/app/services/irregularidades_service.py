"""
app/services/ceap_service.py
─────────────────────────────
Agregações e consultas sobre despesas CEAP.
"""

from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.models.ceap_models import DespesaCEAP, RemuneracaoDeputado


@dataclass
class GastoCategoria:
    tipo_despesa: str
    total: float
    quantidade: int
    media_por_item: float


@dataclass
class GastoFornecedor:
    nome_fornecedor: str
    cnpj_cpf: str
    total: float
    quantidade: int


@dataclass
class ResumoCEAP:
    deputado_id: str
    ano: int
    total_gasto: float
    total_remuneracao_anual: float
    razao_ceap_salario: float          # total_ceap / remuneracao_anual
    por_categoria: list[GastoCategoria] = field(default_factory=list)
    top_fornecedores: list[GastoFornecedor] = field(default_factory=list)


def gastos_por_categoria(
    db: Session,
    deputado_id: str,
    ano: Optional[int] = None,
) -> list[GastoCategoria]:
    q = (
        db.query(
            DespesaCEAP.tipo_despesa,
            func.sum(DespesaCEAP.valor_liquido).label("total"),
            func.count(DespesaCEAP.id).label("qtd"),
        )
        .filter(DespesaCEAP.deputado_id == deputado_id)
        .group_by(DespesaCEAP.tipo_despesa)
        .order_by(desc("total"))
    )
    if ano:
        q = q.filter(DespesaCEAP.ano == ano)

    return [
        GastoCategoria(
            tipo_despesa=r.tipo_despesa,
            total=float(r.total or 0),
            quantidade=r.qtd,
            media_por_item=float(r.total or 0) / r.qtd if r.qtd else 0,
        )
        for r in q.all()
    ]


def gastos_por_fornecedor(
    db: Session,
    deputado_id: str,
    ano: Optional[int] = None,
    limite: int = 20,
) -> list[GastoFornecedor]:
    q = (
        db.query(
            DespesaCEAP.nome_fornecedor,
            DespesaCEAP.cnpj_cpf_fornecedor,
            func.sum(DespesaCEAP.valor_liquido).label("total"),
            func.count(DespesaCEAP.id).label("qtd"),
        )
        .filter(DespesaCEAP.deputado_id == deputado_id)
        .group_by(DespesaCEAP.nome_fornecedor, DespesaCEAP.cnpj_cpf_fornecedor)
        .order_by(desc("total"))
        .limit(limite)
    )
    if ano:
        q = q.filter(DespesaCEAP.ano == ano)

    return [
        GastoFornecedor(
            nome_fornecedor=r.nome_fornecedor,
            cnpj_cpf=r.cnpj_cpf_fornecedor,
            total=float(r.total or 0),
            quantidade=r.qtd,
        )
        for r in q.all()
    ]


def evolucao_mensal(
    db: Session,
    deputado_id: str,
    ano: int,
) -> list[dict]:
    """Retorna total gasto por mês para um ano — útil para gráfico de linha."""
    rows = (
        db.query(
            DespesaCEAP.mes,
            func.sum(DespesaCEAP.valor_liquido).label("total"),
        )
        .filter(DespesaCEAP.deputado_id == deputado_id, DespesaCEAP.ano == ano)
        .group_by(DespesaCEAP.mes)
        .order_by(DespesaCEAP.mes)
        .all()
    )
    por_mes = {r.mes: float(r.total or 0) for r in rows}
    return [{"mes": m, "total": por_mes.get(m, 0.0)} for m in range(1, 13)]


def resumo_ceap(
    db: Session,
    deputado_id: str,
    ano: int,
) -> Optional[ResumoCEAP]:
    total_row = (
        db.query(func.sum(DespesaCEAP.valor_liquido))
        .filter(DespesaCEAP.deputado_id == deputado_id, DespesaCEAP.ano == ano)
        .scalar()
    )
    if total_row is None:
        return None
    total_gasto = float(total_row)

    rem_rows = (
        db.query(func.sum(RemuneracaoDeputado.valor_bruto))
        .filter(
            RemuneracaoDeputado.deputado_id == deputado_id,
            RemuneracaoDeputado.ano == ano,
        )
        .scalar()
    )
    remuneracao_anual = float(rem_rows or 0)

    razao = (total_gasto / remuneracao_anual) if remuneracao_anual > 0 else 0.0

    return ResumoCEAP(
        deputado_id=deputado_id,
        ano=ano,
        total_gasto=total_gasto,
        total_remuneracao_anual=remuneracao_anual,
        razao_ceap_salario=razao,
        por_categoria=gastos_por_categoria(db, deputado_id, ano),
        top_fornecedores=gastos_por_fornecedor(
            db, deputado_id, ano, limite=10),
    )
