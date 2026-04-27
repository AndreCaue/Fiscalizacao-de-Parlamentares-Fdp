from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class PatrimonioTSE(Base):
    """
    Bens declarados ao TSE por candidatos (2022, 2026).
    Match com Deputado feito por fuzzy name no momento da ingestão.
    """
    __tablename__ = "patrimonio_tse"

    id = Column(Integer, primary_key=True, autoincrement=True)

    deputado_id = Column(String, ForeignKey(
        "deputados.id"), nullable=True, index=True)

    sq_candidato = Column(String, index=True)
    nome_candidato = Column(String)
    ano_eleicao = Column(Integer, index=True)
    nr_ordem_bem = Column(Integer)
    ds_tipo_bem = Column(String)
    ds_bem = Column(String)
    vr_bem_candidato = Column(Float)

    score_match = Column(Float, nullable=True)
    importado_em = Column(DateTime, server_default=func.now())

    deputado = relationship(
        "Deputado", backref="patrimonio_tse", foreign_keys=[deputado_id])

    __table_args__ = (
        UniqueConstraint(
            "sq_candidato", "ano_eleicao", "nr_ordem_bem",
            name="uq_patrimonio_tse_bem"
        ),
    )

    def __repr__(self):
        return (
            f"<PatrimonioTSE ano={self.ano_eleicao} "
            f"dep={self.deputado_id} tipo={self.ds_tipo_bem} "
            f"valor={self.vr_bem_candidato}>"
        )
