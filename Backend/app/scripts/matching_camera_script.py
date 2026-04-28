import re
import unicodedata
from difflib import SequenceMatcher
from collections import defaultdict

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Deputado, TSECandidato


# ==========================================================
# CONFIG
# ==========================================================
ANO = 2022
LIMIAR_SCORE = 0.70


# ==========================================================
# FUNÇÕES
# ==========================================================
def remover_acentos(txt: str) -> str:
    if not txt:
        return ""

    return "".join(
        c for c in unicodedata.normalize("NFD", txt)
        if unicodedata.category(c) != "Mn"
    )


def normalizar(txt: str) -> str:
    txt = txt or ""

    txt = remover_acentos(txt.upper())

    txt = re.sub(r"\b(DE|DA|DO|DAS|DOS)\b", " ", txt)
    txt = re.sub(r"[^A-Z0-9 ]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()

    return txt


def score(a: str, b: str) -> float:
    if not a or not b:
        return 0

    return SequenceMatcher(None, a, b).ratio()


def primeira_palavra(txt: str) -> str:
    partes = txt.split()
    return partes[0] if partes else ""


# ==========================================================
# SCRIPT PRINCIPAL
# ==========================================================
def main():
    print("=" * 60)
    print("🚀 MATCHING RÁPIDO CÂMARA x TSE")
    print("=" * 60)

    db: Session = SessionLocal()

    # limpa vínculos antigos
    db.query(TSECandidato).update(
        {TSECandidato.deputado_id: None},
        synchronize_session=False
    )
    db.commit()

    deputados = db.query(Deputado).all()
    candidatos = db.query(TSECandidato).filter(
        TSECandidato.ano == ANO
    ).all()

    print(f"👤 Deputados: {len(deputados)}")
    print(f"🗳️ Candidatos TSE: {len(candidatos)}")

    # ======================================================
    # INDEXAÇÃO INTELIGENTE
    # ======================================================
    indice = defaultdict(list)

    for cand in candidatos:

        nome = normalizar(cand.nome)
        urna = normalizar(cand.nome_urna)

        chave1 = primeira_palavra(nome)
        chave2 = primeira_palavra(urna)

        item = {
            "obj": cand,
            "nome": nome,
            "urna": urna
        }

        if chave1:
            indice[chave1].append(item)

        if chave2 and chave2 != chave1:
            indice[chave2].append(item)

    print("⚡ Índice criado.")

    # ======================================================
    # MATCHING
    # ======================================================
    relacionados = 0
    sem_match = 0

    for i, dep in enumerate(deputados, start=1):

        nome_dep = normalizar(dep.nome)
        chave = primeira_palavra(nome_dep)

        candidatos_possiveis = indice.get(chave, [])

        melhor = None
        melhor_score = 0

        for cand in candidatos_possiveis:

            s1 = score(nome_dep, cand["urna"])   # prioridade
            s2 = score(nome_dep, cand["nome"])

            s = max(s1, s2)

            if s > melhor_score:
                melhor_score = s
                melhor = cand["obj"]

        if melhor and melhor_score >= LIMIAR_SCORE:
            melhor.deputado_id = dep.id
            relacionados += 1
        else:
            sem_match += 1

        if i % 50 == 0:
            print(f"🔎 Processados: {i}/{len(deputados)}")

    db.commit()

    print("=" * 60)
    print("🎉 MATCHING FINALIZADO")
    print("=" * 60)
    print(f"✅ Relacionados: {relacionados}")
    print(f"❌ Sem match: {sem_match}")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    main()