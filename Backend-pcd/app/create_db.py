from .database import Base, engine
# Importar todos os modelos para garantir que o SQLAlchemy os conheça ao criar as tabelas
from .models.partido import Partido
from .models.deputado import Deputado
from .models.votacao import Votacao, Voto, OrientacaoBancada, SyncLog
from .models.empresa import Empresa, Socio, Relacao
from .models.patrimonio import PatrimonioTSE
from .models.tse_candidato import TSECandidato
from .models.irregularidades_models import AlertaIrregularidade
from .models.ceap_models import DespesaCEAP, RemuneracaoDeputado


def init_db():
    print("Criando tabelas no banco de dados...")
    Base.metadata.create_all(bind=engine)
    print("Tabelas criadas com sucesso!")


if __name__ == "__main__":
    init_db()
