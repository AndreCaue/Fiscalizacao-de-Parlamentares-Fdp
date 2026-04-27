from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.orm import relationship
from .base import Base

class Partido(Base):
    __tablename__ = "partidos"

    id = Column(String, primary_key=True, index=True)
    nome = Column(String)
    sigla = Column(String, unique=True, index=True)
    
    deputados = relationship("Deputado", back_populates="partido")
    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, onupdate=func.now())
