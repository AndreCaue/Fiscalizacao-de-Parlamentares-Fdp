import pandas as pd
from ..database import SessionLocal
from ..models.empresa import Empresa
import sys

def importar_empresas(csv_path: str):
    print(f"Iniciando importação de empresas de: {csv_path}")
    db = SessionLocal()
    
    try:
        chunk_size = 10000
        total = 0
        
        for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
            for _, row in chunk.iterrows():
                empresa = Empresa(
                    cnpj=str(row.get("cnpj", "")),
                    razao_social=str(row.get("razao_social", "")),
                    nome_fantasia=str(row.get("nome_fantasia", "")),
                    municipio=str(row.get("municipio", "")),
                    estado=str(row.get("estado", "")),
                    situacao=str(row.get("situacao", ""))
                )
                db.add(empresa)
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
        print("Uso: python -m app.ingest.import_empresas <caminho_csv>")
    else:
        importar_empresas(sys.argv[1])
