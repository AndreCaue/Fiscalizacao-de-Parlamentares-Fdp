from dataclasses import dataclass, field
from collections import defaultdict
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.deputado import Deputado
from app.models.partido import Partido
from app.models.votacao import OrientacaoBancada, Votacao, Voto

COR_VOTO: dict[str, str] = {
    "SIM": "#22c55e",
    "NAO": "#ef4444",
    "ABSTENCAO": "#3b82f6",
    "OBSTRUCAO": "#f59e0b",
    "LIBERADO": "#9ca3af",
}
COR_VOTO_FALLBACK = "#6b7280"


def _cor_voto(voto: str) -> str:
    return COR_VOTO.get(voto.upper(), COR_VOTO_FALLBACK)


@dataclass
class GrafoResponse:
    nodes: list[dict]
    edges: list[dict]
    total: int
    meta: dict


class VotacoesService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_votacao_or_404(self, votacao_id: str) -> Votacao:
        votacao = self.db.query(Votacao).filter(
            Votacao.id == votacao_id).first()
        if not votacao:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Votação '{votacao_id}' não encontrada.",
            )
        return votacao

    def find_grafo(self, votacao_id: str) -> GrafoResponse:
        """
        Retorna um grafo bipartido compatível com ReactFlow no frontend:

            [PartidoNode]  ──edge──►  [DeputadoNode]
        """
        self._get_votacao_or_404(votacao_id)

        votos: list[Voto] = (
            self.db.query(Voto)
            .filter(Voto.votacao_id == votacao_id)
            .options(
                joinedload(Voto.deputado).joinedload(Deputado.partido)
            )
            .all()
        )

        if not votos:
            return GrafoResponse(
                nodes=[],
                edges=[],
                total=0,
                meta={"votacao_id": votacao_id, "total_votos": 0},
            )

        orientacoes: list[OrientacaoBancada] = (
            self.db.query(OrientacaoBancada)
            .filter(OrientacaoBancada.votacao_id == votacao_id)
            .all()
        )

        orientacao_por_partido: dict[str, OrientacaoBancada] = {
            o.sigla_partido_bloco.upper(): o for o in orientacoes
        }

        nodes: list[dict] = []
        edges: list[dict] = []
        partidos_vistos: dict[str, dict] = {}

        contagem_votos: dict[str, int] = defaultdict(int)

        for voto in votos:
            dep: Deputado = voto.deputado
            par: Partido = dep.partido
            tipo_voto = (voto.voto or "").upper()
            contagem_votos[tipo_voto] += 1

            if par.id not in partidos_vistos:
                orientacao_obj = orientacao_por_partido.get(
                    (par.sigla or "").upper())
                p_id = f"partido-{par.id}"
                p_node = {
                    "id": p_id,
                    "type": "partido",
                    "data": {
                        "label": par.sigla or par.id,
                        "nomeCompleto": par.nome or "",
                        "orientacao": orientacao_obj.orientacao if orientacao_obj else None,
                        "corOrientacao": _cor_voto(orientacao_obj.orientacao) if orientacao_obj else None,
                        "count": 0
                    },
                    "position": {"x": 0, "y": 0}
                }
                partidos_vistos[par.id] = p_node
                nodes.append(p_node)

            partidos_vistos[par.id]["data"]["count"] += 1

            d_id = f"deputado-{dep.id}"
            nodes.append({
                "id": d_id,
                "type": "deputado",
                "data": {
                    "label": dep.nome,
                    "partido": par.sigla or "",
                    "estado": dep.estado or "",
                    "urlFoto": dep.url_foto,
                    "voto": tipo_voto,
                    "cor": _cor_voto(tipo_voto),
                    "seguiuOrientacao": voto.seguiu_orientacao,
                },
                "position": {"x": 0, "y": 0}
            })

            edges.append({
                "id": f"e-{par.id}-{dep.id}",
                "source": f"partido-{par.id}",
                "target": d_id,
                "voto": tipo_voto,
                "cor": _cor_voto(tipo_voto),
            })

        total = len(votos)
        return GrafoResponse(
            nodes=nodes,
            edges=edges,
            total=total,
            meta={
                "votacaoId": votacao_id,
                "totalVotos": total,
                "totalPartidos": len(partidos_vistos),
                "contagemVotos": dict(contagem_votos),
            },
        )
