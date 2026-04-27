from sqlalchemy import Column, String, DateTime, func, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base


class Votacao(Base):
    __tablename__ = "votacoes"

    id = Column(String, primary_key=True, index=True)
    descricao = Column(String)
    data = Column(DateTime)
    tipo = Column(String)
    sigla_tipo = Column(String, nullable=True)
    uri = Column(String, nullable=True)

    votos = relationship("Voto", back_populates="votacao")
    orientacoes = relationship("OrientacaoBancada", back_populates="votacao")
    criado_em = Column(DateTime, server_default=func.now())


class Voto(Base):
    __tablename__ = "votos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    deputado_id = Column(String, ForeignKey("deputados.id"))
    votacao_id = Column(String, ForeignKey("votacoes.id"))
    voto = Column(String)
    seguiu_orientacao = Column(Boolean, nullable=True)

    deputado = relationship("Deputado", back_populates="votos")
    votacao = relationship("Votacao", back_populates="votos")
    criado_em = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint(
        'deputado_id', 'votacao_id', name='_deputado_votacao_uc'),)


class OrientacaoBancada(Base):
    __tablename__ = "orientacoes_bancada"

    id = Column(Integer, primary_key=True, autoincrement=True)
    votacao_id = Column(String, ForeignKey("votacoes.id"))
    sigla_partido_bloco = Column(String)
    cod_partido_bloco = Column(Integer, nullable=True)
    tipo_lideranca = Column(String)  # P ou B
    orientacao = Column(String)

    votacao = relationship("Votacao", back_populates="orientacoes")
    criado_em = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint(
        'votacao_id', 'sigla_partido_bloco', name='_votacao_partido_uc'),)


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(String)
    status = Column(String)
    mensagem = Column(String, nullable=True)
    registros = Column(Integer, nullable=True)
    criado_em = Column(DateTime, server_default=func.now())
