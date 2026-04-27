from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class TSECandidato(Base):
    __tablename__ = "tse_candidato"

    sq_candidato = Column(String, primary_key=True)
    nome = Column(String)
    nome_urna = Column(String)
    cpf = Column(String, nullable=True)
    ano = Column(Integer)

    deputado_id = Column(String, ForeignKey("deputados.id"), nullable=True)
