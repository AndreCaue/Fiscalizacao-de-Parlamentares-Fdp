from sqlalchemy.orm import Session
from datetime import datetime
from ..models.partido import Partido
from ..models.deputado import Deputado
from ..models.votacao import Votacao, Voto, OrientacaoBancada, SyncLog
from dateutil.relativedelta import relativedelta
from .camara_api import CamaraAPI
import logging
import asyncio

logger = logging.getLogger(__name__)


class IntegracaoService:
    def __init__(self, db: Session):
        self.db = db
        self.api = CamaraAPI()

    def _criar_log(self, tipo: str):
        log = SyncLog(tipo=tipo, status="running")
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        return log

    def _atualizar_log(self, log_id: int, status: str, registros: int = 0, mensagem: str = None):
        log = self.db.query(SyncLog).filter(SyncLog.id == log_id).first()
        if log:
            log.status = status
            log.registros = registros
            log.mensagem = mensagem
            self.db.commit()

    async def sincronizar_partidos(self):
        log = self._criar_log("partidos")
        try:
            partidos = await self.api.buscar_partidos()
            cont = 0
            for p in partidos:
                partido = self.db.query(Partido).filter(
                    Partido.id == str(p["id"])).first()
                if not partido:
                    partido = Partido(id=str(p["id"]))
                    self.db.add(partido)
                partido.nome = p["nome"]
                partido.sigla = p["sigla"]
                cont += 1
            self.db.commit()
            self._atualizar_log(log.id, "success", cont)
        except Exception as e:
            self._atualizar_log(log.id, "error", 0, str(e))

    async def sincronizar_deputados(self):
        log = self._criar_log("deputados")
        log_id = log.id
        try:
            deputados = await self.api.buscar_deputados()
            cont = 0
            ids_vistos = set()

            for d in deputados:
                dep_id = str(d["id"])

                if dep_id in ids_vistos:
                    continue
                ids_vistos.add(dep_id)

                partido = self.db.query(Partido).filter(
                    Partido.sigla == d["siglaPartido"]).first()
                if not partido:
                    partido_id = f"sigla-{d['siglaPartido']}"
                    partido = self.db.query(Partido).filter(
                        Partido.id == partido_id).first()
                    if not partido:
                        partido = Partido(
                            id=partido_id, nome=d["siglaPartido"], sigla=d["siglaPartido"])
                        self.db.add(partido)
                        self.db.flush()

                dep = self.db.query(Deputado).filter(
                    Deputado.id == dep_id).first()
                if not dep:
                    dep = Deputado(id=dep_id)
                    self.db.add(dep)

                dep.nome = d["nome"]
                dep.estado = d["siglaUf"]
                dep.url_foto = d["urlFoto"]
                dep.email = d.get("email")
                dep.partido_id = partido.id
                cont += 1

            self.db.commit()
            self._atualizar_log(log_id, "success", cont)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Erro ao sincronizar deputados: {e}")
            self._atualizar_log(log_id, "error", 0, str(e))

    async def sincronizar_votacoes(self, data_inicio=None):
        log = self._criar_log("votacoes")
        log_id = log.id
        try:
            votacoes = await self.api.buscar_votacoes(data_inicio)
            cont = 0
            ids_vistos = set()

            for v in votacoes:
                vot_id = str(v["id"])

                if vot_id in ids_vistos:
                    continue
                ids_vistos.add(vot_id)

                vot = self.db.query(Votacao).filter(
                    Votacao.id == vot_id).first()
                if not vot:
                    vot = Votacao(id=vot_id)
                    self.db.add(vot)

                vot.descricao = v.get("descricao") or f"Votação {v['id']}"

                dt_str = v.get("data") or v.get("dataHoraRegistro")
                if dt_str:
                    try:
                        vot.data = datetime.fromisoformat(
                            dt_str.replace("Z", "+00:00"))
                    except:
                        vot.data = None
                else:
                    vot.data = None

                vot.tipo = v.get("tipoVotacao") or "Nominal"
                vot.sigla_tipo = v.get("siglaOrgao") or (
                    v.get("proposta") or {}).get("siglaTipo")
                vot.uri = v.get("uri")
                cont += 1

            self.db.commit()
            self._atualizar_log(log_id, "success", cont)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Erro ao sincronizar votações: {e}")
            self._atualizar_log(log_id, "error", 0, str(e)
                                )

    async def sincronizar_votos(self, votacao_id: str):
        try:
            votos_api = await self.api.buscar_votos_detalhes(votacao_id)

            print("Exemplo voto:", votos_api[:2])
            votos_normalizados = []

            for item in votos_api:
                if isinstance(item, dict) and "dados" in item:
                    votos_normalizados.extend(item["dados"])
                elif isinstance(item, list):
                    votos_normalizados.extend(item)
                elif isinstance(item, dict):
                    votos_normalizados.append(item)

            print(f"Votos normalizados: {len(votos_normalizados)}")

            for v in votos_api:

                if not isinstance(v, dict):
                    print("Ignorado (não é dict):", v)
                    continue

                dep_data = v.get("deputado_") or v.get("deputado")

                if not dep_data:
                    continue

                dep_id = str(dep_data.get("id"))
                tipo_voto = self.api.normalizar_voto(v.get("tipoVoto"))

                voto = self.db.query(Voto).filter(
                    Voto.deputado_id == dep_id,
                    Voto.votacao_id == votacao_id
                ).first()

                if not voto:
                    voto = Voto(deputado_id=dep_id, votacao_id=votacao_id)
                    self.db.add(voto)

                voto.voto = tipo_voto

            self.db.commit()

            await self.sincronizar_orientacoes(votacao_id)
            await self.calcular_disciplina(votacao_id)

        except Exception as e:
            self.db.rollback()
            print(f"Erro ao sincronizar votos de {votacao_id}: {e}")

    async def sincronizar_orientacoes(self, votacao_id: str):
        orientacoes = await self.api.buscar_orientacoes(votacao_id)
        for o in orientacoes:
            sigla = o["siglaPartidoBloco"]
            ori = self.db.query(OrientacaoBancada).filter(
                OrientacaoBancada.votacao_id == votacao_id, OrientacaoBancada.sigla_partido_bloco == sigla).first()
            if not ori:
                ori = OrientacaoBancada(
                    votacao_id=votacao_id, sigla_partido_bloco=sigla)
                self.db.add(ori)
            ori.cod_partido_bloco = o.get("codPartidoBloco")
            ori.tipo_lideranca = o["codTipoLideranca"]
            ori.orientacao = self.api.normalizar_orientacao(
                o["orientacaoVoto"])
        self.db.commit()

    async def calcular_disciplina(self, votacao_id: str):
        orientacoes = self.db.query(OrientacaoBancada).filter(
            OrientacaoBancada.votacao_id == votacao_id, OrientacaoBancada.tipo_lideranca == "P").all()
        mapa_ori = {o.sigla_partido_bloco: o.orientacao for o in orientacoes}

        votos = self.db.query(Voto).filter(Voto.votacao_id == votacao_id).all()
        for v in votos:
            dep = self.db.query(Deputado).filter(
                Deputado.id == v.deputado_id).first()
            if not dep or not dep.partido:
                continue

            sigla = dep.partido.sigla
            ori_partido = mapa_ori.get(sigla)

            if ori_partido and ori_partido not in ["AUSENTE", "LIBERADO"]:
                v.seguiu_orientacao = (v.voto == ori_partido)
        self.db.commit()

    async def sync_full(self, data_inicio=None):
        await self.sincronizar_partidos()
        await self.sincronizar_deputados()
        await self.sincronizar_votacoes(data_inicio)

        votacoes = self.db.query(Votacao)\
            .order_by(Votacao.data.desc())\
            .limit(100)\
            .all()

        votacoes_pendentes = []
        for v in votacoes:
            existe = self.db.query(Voto.id)\
                .filter(Voto.votacao_id == v.id)\
                .first()
            if not existe:
                votacoes_pendentes.append(v)

        print(f"Votações pendentes: {len(votacoes_pendentes)}")

        semaforo = asyncio.Semaphore(5)

        async def processar_votacao(v):
            async with semaforo:
                try:
                    await self.sincronizar_votos(v.id)
                    await asyncio.sleep(0.2)
                except Exception as e:
                    print(f"Erro na votação {v.id}: {e}")

        await asyncio.gather(*[
            processar_votacao(v) for v in votacoes_pendentes
        ])

    @staticmethod
    def gerar_periodos(data_inicio: str, data_fim: str, janela_meses: int = 1) -> list[tuple[str, str]]:
        inicio = datetime.strptime(data_inicio, "%Y-%m-%d")
        fim = datetime.strptime(data_fim, "%Y-%m-%d")
        periodos = []
        atual = inicio
        while atual < fim:
            proximo = min(atual + relativedelta(months=janela_meses), fim)
            periodos.append((
                atual.strftime("%Y-%m-%d"),
                proximo.strftime("%Y-%m-%d")
            ))
            atual = proximo
        return periodos

    async def sync_full_historico(self, data_inicio: str = "2021-01-01", data_fim: str = None, janela_meses: int = 1):
        if data_fim is None:
            data_fim = datetime.now().strftime("%Y-%m-%d")

        await self.sincronizar_partidos()
        await self.sincronizar_deputados()

        periodos = self.gerar_periodos(data_inicio, data_fim, janela_meses)
        logger.info(
            f"Sincronizando {len(periodos)} períodos de {janela_meses} mês(es)...")

        for i, (inicio, fim) in enumerate(periodos):
            logger.info(f"[{i+1}/{len(periodos)}] Período: {inicio} → {fim}")
            try:
                await self.sincronizar_votacoes_periodo(inicio, fim)
                await asyncio.sleep(3)
            except Exception as e:
                logger.error(f"Erro no período {inicio}→{fim}: {e}")
                continue

        await self._sincronizar_votos_pendentes()

    async def sincronizar_votacoes_periodo(self, data_inicio: str, data_fim: str):
        """Sincroniza votações de um período específico (substitui sincronizar_votacoes)."""
        log = self._criar_log(f"votacoes:{data_inicio}:{data_fim}")
        log_id = log.id
        try:
            votacoes = await self.api.buscar_votacoes(data_inicio, data_fim)
            cont = 0
            ids_vistos = set()

            for v in votacoes:
                vot_id = str(v["id"])
                if vot_id in ids_vistos:
                    continue
                ids_vistos.add(vot_id)

                vot = self.db.query(Votacao).filter(
                    Votacao.id == vot_id).first()
                if not vot:
                    vot = Votacao(id=vot_id)
                    self.db.add(vot)

                vot.descricao = v.get("descricao") or f"Votação {v['id']}"
                dt_str = v.get("data") or v.get("dataHoraRegistro")
                if dt_str:
                    try:
                        vot.data = datetime.fromisoformat(
                            dt_str.replace("Z", "+00:00"))
                    except:
                        vot.data = None
                else:
                    vot.data = None

                vot.tipo = v.get("tipoVotacao") or "Nominal"
                vot.sigla_tipo = v.get("siglaOrgao") or (
                    v.get("proposta") or {}).get("siglaTipo")
                vot.uri = v.get("uri")
                cont += 1

            self.db.commit()
            self._atualizar_log(log_id, "success", cont)
            logger.info(
                f"  ✓ {cont} votações salvas ({data_inicio} → {data_fim})")

        except Exception as e:
            self.db.rollback()
            logger.error(f"Erro votações {data_inicio}→{data_fim}: {e}")
            self._atualizar_log(log_id, "error", 0, str(e))

    async def _sincronizar_votos_pendentes(self):
        """Busca votos de votações que ainda não têm votos registrados."""
        votacoes = self.db.query(Votacao).order_by(Votacao.data.desc()).all()
        pendentes = [
            v for v in votacoes
            if not self.db.query(Voto.id).filter(Voto.votacao_id == v.id).first()
        ]
        logger.info(f"{len(pendentes)} votações pendentes de votos.")

        semaforo = asyncio.Semaphore(5)

        async def processar(v):
            async with semaforo:
                try:
                    await self.sincronizar_votos(v.id)
                    await asyncio.sleep(0.2)
                except Exception as e:
                    logger.error(f"Erro votos {v.id}: {e}")

        await asyncio.gather(*[processar(v) for v in pendentes])
