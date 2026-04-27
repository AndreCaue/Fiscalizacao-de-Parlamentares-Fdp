import httpx
from typing import List, Dict, Any, Optional
import logging
import asyncio

logger = logging.getLogger(__name__)

TIMEOUT = httpx.Timeout(connect=5.0, read=20.0, write=5.0, pool=5.0)
MAX_RETRIES = 3


class CamaraAPI:
    BASE_URL = "https://dadosabertos.camara.leg.br/api/v2"

    async def _request(self, client: httpx.AsyncClient, path: str, params: Dict) -> List[Dict[str, Any]]:
        """Executa GET com retry e backoff exponencial."""
        url = f"{self.BASE_URL}{path}"
        for tentativa in range(MAX_RETRIES):
            try:
                response = await client.get(
                    url,
                    params=params,
                    headers={"Accept": "application/json"}
                )
                logger.info(f"GET {path} → Status {response.status_code}")
                response.raise_for_status()
                return response.json().get("dados", [])

            except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
                if tentativa == MAX_RETRIES - 1:
                    logger.error(
                        f"Timeout definitivo em {path} após {MAX_RETRIES} tentativas")
                    return []
                wait = 2 ** tentativa
                logger.warning(
                    f"Timeout em {path}, tentativa {tentativa + 1}/{MAX_RETRIES}. Aguardando {wait}s...")
                await asyncio.sleep(wait)

            except Exception as e:
                logger.error(
                    f"Erro ao buscar {path}: {type(e).__name__} - {e}")
                return []

        return []

    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        is_detail = path.endswith(("/votos", "/orientacoes"))
        pagination_params = {} if is_detail else {"itens": 100, "pagina": 1}
        final_params = {**pagination_params, **(params or {})}

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            return await self._request(client, path, final_params)

    async def _get_with_retry(self, url: str, params: dict, max_retries: int = 4) -> dict | None:
        """Faz GET com retry exponencial em caso de 429, 502, 503, 504."""
        delays = [5, 15, 30, 60]

        async with httpx.AsyncClient(timeout=30) as client:
            for tentativa in range(max_retries):
                try:
                    response = await client.get(url, params=params)

                    if response.status_code == 200:
                        return response.json()

                    if response.status_code in (429, 502, 503, 504):
                        wait = delays[min(tentativa, len(delays) - 1)]
                        logger.warning(
                            f"HTTP {response.status_code} em {url} "
                            f"(tentativa {tentativa+1}/{max_retries}). "
                            f"Aguardando {wait}s..."
                        )
                        await asyncio.sleep(wait)
                        continue

                    response.raise_for_status()

                except httpx.TimeoutException:
                    wait = delays[min(tentativa, len(delays) - 1)]
                    logger.warning(f"Timeout em {url}. Aguardando {wait}s...")
                    await asyncio.sleep(wait)

        logger.error(f"Falhou após {max_retries} tentativas: {url}")
        return None

    async def get_paginated(
        self,
        endpoint: str,
        params: dict,
        max_pages: int = 50
    ) -> List[Dict]:
        """Busca todas as páginas com retry e delay entre páginas."""
        resultados = []
        url = f"{self.BASE_URL}{endpoint}"

        for pagina in range(1, max_pages + 1):
            params_pag = {**params, "itens": 100, "pagina": pagina}
            logger.info(f"Buscando {endpoint} página {pagina}...")

            data = await self._get_with_retry(url, params_pag)

            if not data:
                logger.warning(
                    f"Sem dados na página {pagina} de {endpoint}. Encerrando.")
                break

            itens = data.get("dados", [])
            if not itens:
                break

            resultados.extend(itens)
            logger.info(f"  → {len(itens)} itens (total: {len(resultados)})")

            if len(itens) < 100:
                break

            await asyncio.sleep(1.5)

        return resultados

    async def buscar_deputados(self, legislatura: int = 57) -> List[Dict[str, Any]]:
        return await self.get_paginated("/deputados", {"idLegislatura": legislatura}, max_pages=10)

    async def buscar_partidos(self) -> List[Dict[str, Any]]:
        return await self.get("/partidos")

    async def buscar_votacoes(
        self,
        data_inicio: Optional[str] = None,
        data_fim: Optional[str] = None
    ) -> List[Dict[str, Any]]:

        params = {
            "ordenarPor": "data",
            "ordem": "desc"
        }

        if data_inicio:
            params["dataInicio"] = data_inicio
        if data_fim:
            params["dataFim"] = data_fim

        return await self.get_paginated(
            "/votacoes",
            params,
            max_pages=50
        )

    async def buscar_votos_detalhes(self, votacao_id: str):
        response = await self.get(f"/votacoes/{votacao_id}/votos")

        if isinstance(response, dict):
            return response.get("dados", [])

        if isinstance(response, list):
            return response

        return []

    async def buscar_orientacoes(self, votacao_id: str) -> List[Dict[str, Any]]:
        return await self.get(f"/votacoes/{votacao_id}/orientacoes")

    def normalizar_voto(self, tipo_voto: str) -> str:
        mapa = {
            "Sim": "SIM", "sim": "SIM", "SIM": "SIM",
            "Não": "NAO", "Nao": "NAO", "não": "NAO", "NAO": "NAO", "NÃO": "NAO",
            "Abstenção": "ABSTENCAO", "Abstencao": "ABSTENCAO", "ABSTENCAO": "ABSTENCAO",
            "Obstrução": "OBSTRUCAO", "Obstrucao": "OBSTRUCAO", "OBSTRUCAO": "OBSTRUCAO"
        }
        return mapa.get(tipo_voto, "ABSTENCAO")

    def normalizar_orientacao(self, orientacao: str) -> str:
        mapa = {
            "Sim": "SIM", "Não": "NAO", "Abstenção": "ABSTENCAO",
            "Obstrução": "OBSTRUCAO", "Liberado": "LIBERADO", "": "AUSENTE"
        }
        return mapa.get(orientacao, "AUSENTE")
