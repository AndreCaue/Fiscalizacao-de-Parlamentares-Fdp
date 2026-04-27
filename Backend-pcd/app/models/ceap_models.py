from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, UniqueConstraint, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DespesaCEAP(Base):
    """
    Cota para o Exercício da Atividade Parlamentar (CEAP).
    Fonte: API Dados Abertos da Câmara — /deputados/{id}/despesas
    """
    __tablename__ = "despesas_ceap"

    id = Column(Integer, primary_key=True, autoincrement=True)

    deputado_id = Column(String, ForeignKey(
        "deputados.id"), nullable=False, index=True)

    ano = Column(Integer, index=True)
    mes = Column(Integer, index=True)
    tipo_despesa = Column(String, index=True)
    cnpj_cpf_fornecedor = Column(String, index=True)
    nome_fornecedor = Column(String)
    numero_documento = Column(String)
    data_documento = Column(Date, nullable=True)
    valor_documento = Column(Float)
    valor_glosa = Column(Float, default=0.0)
    valor_liquido = Column(Float)
    url_documento = Column(String, nullable=True)

    importado_em = Column(DateTime, server_default=func.now())

    deputado = relationship(
        "Deputado", backref="despesas_ceap", foreign_keys=[deputado_id])

    __table_args__ = (
        UniqueConstraint(
            "deputado_id", "ano", "mes", "numero_documento", "cnpj_cpf_fornecedor",
            name="uq_despesa_ceap"
        ),
    )

    def __repr__(self):
        return (
            f"<DespesaCEAP dep={self.deputado_id} "
            f"{self.ano}/{self.mes:02d} {self.tipo_despesa} R${self.valor_liquido:.2f}>"
        )


class RemuneracaoDeputado(Base):
    """
    Remuneração mensal do deputado consultada via API da Câmara.
    """
    __tablename__ = "remuneracao_deputados"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deputado_id = Column(String, ForeignKey(
        "deputados.id"), nullable=False, index=True)
    ano = Column(Integer)
    mes = Column(Integer)
    valor_bruto = Column(Float)
    valor_liquido = Column(Float, nullable=True)

    importado_em = Column(DateTime, server_default=func.now())

    deputado = relationship(
        "Deputado", backref="remuneracoes", foreign_keys=[deputado_id])

    __table_args__ = (
        UniqueConstraint("deputado_id", "ano", "mes",
                         name="uq_remuneracao_dep"),
    )
