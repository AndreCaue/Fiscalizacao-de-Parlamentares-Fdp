from sqlalchemy import Column, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base


class Deputado(Base):
    __tablename__ = "deputados"

    id = Column(String, primary_key=True, index=True)
    nome = Column(String, index=True)
    # Hipotético/Futuro/Mudar no por força maior, chamada processo.
    cpf = Column(String, index=True, nullable=True)
    #
    partido_id = Column(String, ForeignKey("partidos.id"))
    estado = Column(String)
    url_foto = Column(String, nullable=True)
    email = Column(String, nullable=True)

    partido = relationship("Partido", back_populates="deputados")
    votos = relationship("Voto", back_populates="deputado")
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, onupdate=func.now())
