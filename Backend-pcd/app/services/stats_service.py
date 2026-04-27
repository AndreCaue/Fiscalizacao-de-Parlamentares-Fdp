import pandas as pd
from sqlalchemy.orm import Session
from ..models.votacao import Votacao, Voto, OrientacaoBancada
from ..models.deputado import Deputado
from ..models.partido import Partido


class StatsService:
    def __init__(self, db: Session):
        self.db = db

    def get_resumo(self):
        return {
            "totalVotacoes": self.db.query(Votacao).count(),
            "votacoesComVotos": self.db.query(Votacao).filter(Votacao.votos.any()).count(),
            "totalDeputados": self.db.query(Deputado).count(),
            "totalVotos": self.db.query(Voto).count(),
            "totalPartidos": self.db.query(Partido).count(),
            "totalOrientacoes": self.db.query(OrientacaoBancada).count(),
        }

    def get_distribuicao_votos(self):
        df = pd.read_sql(self.db.query(Voto.voto).statement, self.db.bind)
        if df.empty:
            return {"total": 0, "distribuicao": []}

        counts = df['voto'].value_counts()
        total = int(df.shape[0])

        CORES = {"SIM": "#22c55e", "NAO": "#ef4444",
                 "ABSTENCAO": "#3b82f6", "OBSTRUCAO": "#f59e0b"}
        LABELS = {"SIM": "Sim", "NAO": "Não",
                  "ABSTENCAO": "Abstenção", "OBSTRUCAO": "Obstrução"}

        dist = []
        for tipo, qtd in counts.items():
            dist.append({
                "tipo": tipo,
                "label": LABELS.get(tipo, tipo),
                "quantidade": int(qtd),
                "percentual": round((qtd / total) * 100, 1),
                "cor": CORES.get(tipo, "#6b7280")
            })

        return {"total": total, "distribuicao": dist}

    def get_disciplina_partidos(self, limit=20):
        data = self.db.query(
            Voto.seguiu_orientacao,
            Partido.sigla,
            Partido.nome
        ).join(Deputado, Voto.deputado_id == Deputado.id).join(Partido, Deputado.partido_id == Partido.id).filter(Voto.seguiu_orientacao.isnot(None)).all()

        if not data:
            return {"data": []}

        df = pd.DataFrame(data, columns=['seguiu', 'sigla', 'nome'])

        grouped = df.groupby(['sigla', 'nome']).agg(
            seguiu=('seguiu', lambda x: x.sum()),
            total=('seguiu', 'count')
        ).reset_index()

        grouped['divergiu'] = grouped['total'] - grouped['seguiu']
        grouped['disciplina'] = (
            grouped['seguiu'] / grouped['total'] * 100).round(1)

        result = grouped[grouped['total'] >= 5].sort_values(
            'disciplina', ascending=False).head(limit)
        return {"data": result.to_dict(orient='records')}

    def get_deputados_rebeldes(self, limit=10):
        data = self.db.query(
            Deputado.id,
            Deputado.nome,
            Deputado.url_foto,
            Partido.sigla.label("partido"),
            Deputado.estado,
            Voto.seguiu_orientacao
        ).join(Partido, Deputado.partido_id == Partido.id).join(Voto, Deputado.id == Voto.deputado_id).filter(Voto.seguiu_orientacao.isnot(None)).all()

        if not data:
            return {"rebeldes": [], "alinhados": []}

        df = pd.DataFrame(
            data, columns=['id', 'nome', 'urlFoto', 'partido', 'estado', 'seguiu'])

        grouped = df.groupby(['id', 'nome', 'urlFoto', 'partido', 'estado']).agg(
            seguiu=('seguiu', lambda x: x.sum()),
            total=('seguiu', 'count')
        ).reset_index()

        grouped['divergiu'] = grouped['total'] - grouped['seguiu']
        grouped['disciplina'] = (
            grouped['seguiu'] / grouped['total'] * 100).round(1)

        grouped = grouped[grouped['total'] >= 3]

        rebeldes = grouped.sort_values(
            'disciplina', ascending=True).head(limit)
        alinhados = grouped.sort_values(
            'disciplina', ascending=False).head(limit)

        return {
            "rebeldes": rebeldes.to_dict(orient='records'),
            "alinhados": alinhados.to_dict(orient='records')
        }

    def get_votacoes_destaque(self, limit=5):
        votacoes = self.db.query(Votacao).filter(Votacao.votos.any()).order_by(
            Votacao.data.desc()).limit(limit).all()

        resultado = []
        for v in votacoes:
            contagem = {}
            for voto in v.votos:
                tipo = voto.voto
                contagem[tipo] = contagem.get(tipo, 0) + 1

            resultado.append({
                "id": v.id,
                "descricao": v.descricao,
                "data": v.data,
                "siglaTipo": v.sigla_tipo,
                "totalVotos": len(v.votos),
                "contagem": contagem
            })

        return {"data": resultado}

    def search_deputados(self, nome: str):
        deputados = self.db.query(Deputado).join(Partido).filter(
            Deputado.nome.ilike(f"%{nome}%")
        ).all()

        resultado = []
        for d in deputados:
            resultado.append({
                "id": d.id,
                "nome": d.nome,
                "urlFoto": d.url_foto,
                "partido": d.partido.sigla,
                "estado": d.estado
            })

        return {"data": resultado}
