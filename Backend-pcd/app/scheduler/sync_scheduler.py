import logging
from datetime import datetime
from sqlalchemy.orm import Session
from ..database import SessionLocal
from ..services.integracao_service import IntegracaoService

logger = logging.getLogger(__name__)


async def popular_banco_inicial():
    db: Session = SessionLocal()
    try:
        service = IntegracaoService(db)

        from ..models.votacao import Votacao
        total = db.query(Votacao).count()

        if total > 0:
            logger.info(
                f"Banco já populado ({total} votações). Pulando sync histórico.")
            return

        logger.info(
            "Banco vazio. Iniciando população histórica (2021 → hoje)...")
        await service.sync_full_historico(
            data_inicio="2021-01-01",
            data_fim=datetime.now().strftime("%Y-%m-%d"),
            janela_meses=1
        )
        logger.info("População histórica concluída.")

    except Exception as e:
        logger.error(f"Erro na população inicial: {e}")
    finally:
        db.close()
