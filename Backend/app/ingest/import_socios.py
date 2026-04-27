import pandas as pd
from ..database import SessionLocal
from ..models.empresa import Socio
import sys


def importar_socios(csv_path: str):
    print(f"Iniciando importação de sócios de: {csv_path}")
    db = SessionLocal()

    try:
        chunk_size = 10000
        total = 0

        for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
            for _, row in chunk.iterrows():
                socio = Socio(
                    cpf_socio=str(row.get("cpf_socio", row.get("cpf", ""))),
                    nome_socio=str(row.get("nome_socio", row.get("nome", ""))),
                    cnpj=str(row.get("cnpj", "")),
                    qualificacao=str(row.get("qualificacao", ""))
                )
                db.add(socio)
            db.commit()
            total += len(chunk)
            print(f"Total processado: {total} registros...")

        print("Importação concluída com sucesso!")
    except Exception as e:
        print(f"Erro na importação: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python -m app.ingest.import_socios <caminho_csv>")
    else:
        importar_socios(sys.argv[1])
