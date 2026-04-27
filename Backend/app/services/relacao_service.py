from sqlalchemy.orm import Session
from ..models.deputado import Deputado
from ..models.empresa import Socio, Empresa, Relacao
import logging

logger = logging.getLogger(__name__)


class RelacaoService:
    def __init__(self, db: Session):
        self.db = db

    def buscar_empresas_por_cpf(self, cpf: str):
        # CPF na base de sócios costuma ter 11 dígitos ou máscara
        return self.db.query(Socio).filter(Socio.cpf_socio == cpf).all()

    def buscar_empresas_por_nome(self, nome: str):
        return self.db.query(Socio).filter(Socio.nome_socio.ilike(f"%{nome}%")).all()

    def gerar_relacoes_deputado(self, deputado_id: str):
        deputado = self.db.query(Deputado).filter(
            Deputado.id == deputado_id).first()
        if not deputado:
            return []

        relacoes_encontradas = []

        # 1. Match por CPF
        if deputado.cpf:
            socios = self.buscar_empresas_por_cpf(deputado.cpf)
            for s in socios:
                relacoes_encontradas.append({
                    "cnpj": s.cnpj,
                    "tipo_relacao": "cpf_match",
                    "score_confianca": 100,
                    "nome_socio": s.nome_socio
                })

        # 2. Match por Nome (Fuzzy ou ILike) # FEATURE
        socios_nome = self.buscar_empresas_por_nome(deputado.nome)
        for s in socios_nome:
            # Evita duplicar se já deu match por CPF
            if any(r["cnpj"] == s.cnpj for r in relacoes_encontradas):
                continue

            relacoes_encontradas.append({
                "cnpj": s.cnpj,
                "tipo_relacao": "nome_match",
                "score_confianca": 70,  # Score fixo inicial
                "nome_socio": s.nome_socio
            })

        self.db.query(Relacao).filter(
            Relacao.deputado_id == deputado_id).delete()

        for r in relacoes_encontradas:
            new_rel = Relacao(
                deputado_id=deputado_id,
                cnpj=r["cnpj"],
                tipo_relacao=r["tipo_relacao"],
                score_confianca=r["score_confianca"],
                origem="import_socios"
            )
            self.db.add(new_rel)

        self.db.commit()
        return relacoes_encontradas

    def get_relacoes_com_detalhes(self, deputado_id: str):
        relacoes = self.db.query(Relacao).filter(
            Relacao.deputado_id == deputado_id).all()

        resultado = []
        for r in relacoes:
            empresa = self.db.query(Empresa).filter(
                Empresa.cnpj == r.cnpj).first()
            resultado.append({
                "id": r.id,
                "cnpj": r.cnpj,
                "tipo": r.tipo_relacao,
                "score": r.score_confianca,
                "empresa": {
                    "razao_social": empresa.razao_social if empresa else "Não cadastrada",
                    "municipio": empresa.municipio if empresa else None
                }
            })
        return resultado
