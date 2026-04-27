from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AlertaIrregularidade(Base):
    """
    Alertas gerados pelo cruzamento patrimônio × CEAP × remuneração.
    Cada alerta tem um tipo, score de risco (0–100) e descrição textual.
    """
    __tablename__ = "alertas_irregularidade"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deputado_id = Column(String, ForeignKey(
        "deputados.id"), nullable=False, index=True)

    tipo = Column(String, index=True)
    score_risco = Column(Float)                # 0–100
    titulo = Column(String)
    descricao = Column(Text)
    valor_ref = Column(Float, nullable=True)
    resolvido = Column(Boolean, default=False)

    gerado_em = Column(DateTime, server_default=func.now())

    deputado = relationship("Deputado", backref="alertas",
                            foreign_keys=[deputado_id])

    def __repr__(self):
        return f"<Alerta {self.tipo} dep={self.deputado_id} score={self.score_risco}>"
