# 🇧🇷 FdP — Fiscalização de Parlamentares

> Visualização de votações de deputados brasileiros com dados públicos da API da Câmara dos Deputados.

O **FdP** é uma plataforma de transparência pública que permite aos cidadãos acompanhar de forma clara e intuitiva como seus representantes estão votando no Congresso Nacional. O projeto cruza dados de votações nominais com informações de partidos e perfis dos deputados.

---

## 📸 Funcionalidades

| Tela | Descrição |
|------|-----------|
| **Home** | Resumo das votações mais recentes e acesso rápido à sincronização. |
| **Votações** | Lista paginada de todas as sessões nominais com filtros de data. |
| **Detalhe da Votação** | Lista completa de votos, resumo estatístico e orientação dos partidos. |
| **Deputados** | Catálogo de deputados com busca por nome, partido e estado. |
| **Perfil do Deputado** | Histórico completo de votos, estatísticas de alinhamento e dados patrimoniais. |
| **Grafos de Votação** | Visualização interativa que conecta Partidos → Deputados, colorida pelo tipo de voto. |

### 🎨 Paleta de Votos
- ✅ **SIM:** Verde (`#22c55e`)
- ❌ **NÃO:** Vermelho (`#ef4444`)
- 🔵 **ABSTENÇÃO:** Azul (`#3b82f6`)
- 🟡 **OBSTRUÇÃO:** Âmbar (`#f59e0b`)

---

## 🛠️ Arquitetura e Stack

O projeto é dividido em dois repositórios principais (Monorepo):

### [Backend-pcd](./Backend-pcd)
- **FastAPI** (Python) + SQLAlchemy.
- Banco de Dados **SQLite** (fácil portabilidade).
- Ingestão de dados com **Pandas** e **Httpx**.
- Scheduler para sincronização automática diária.

### [Frontend-pcd](./Frontend-pcd/how-do-you-vote-deputy)
- **Next.js** + TypeScript.
- **TailwindCSS** + Shadcn/UI (Design System).
- **React Flow** para visualização de grafos.
- **Framer Motion** para animações.

---

## 🚀 Como Iniciar

### 1. Backend
```bash
cd Backend-pcd
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### 2. Frontend
```bash
cd Frontend-pcd/how-do-you-vote-deputy
npm install
cp .env.example .env
npm run dev
```

Acesse `http://localhost:3000` para visualizar a aplicação.

---

## 📂 Estrutura do Repositório

- `Backend-pcd/`: API REST em Python e lógica de coleta de dados.
- `Frontend-pcd/`: Aplicação web moderna em Next.js.
- `data/`: (Gerado) Contém o banco de dados local e logs de sincronização.

---

## ⚖️ Licença e Dados
Este projeto é de código aberto sob a licença MIT. Os dados são fornecidos pela **API de Dados Abertos da Câmara dos Deputados**.

---
Desenvolvido para fortalecer a democracia através da tecnologia.
