# 🐍 FdP - Backend (Python)

Este é o backend do projeto **Fiscalização de Parlamentares (FdP)**, desenvolvido em Python utilizando o framework FastAPI. Ele é responsável por coletar, processar e servir os dados da API pública da Câmara dos Deputados.

## 🚀 Tecnologias Utilizadas

- **[FastAPI](https://fastapi.tiangolo.com/):** Framework web moderno e de alta performance.
- **[SQLAlchemy](https://www.sqlalchemy.org/):** ORM para persistência de dados.
- **[SQLite](https://www.sqlite.org/):** Banco de dados relacional leve (para desenvolvimento).
- **[Pandas](https://pandas.pydata.org/):** Processamento e limpeza de grandes volumes de dados.
- **[Pydantic](https://docs.pydantic.dev/):** Validação de dados e definições de esquemas.
- **[Httpx](https://www.python-httpx.org/):** Cliente HTTP assíncrono para consumo da API da Câmara.

## 🛠️ Configuração e Instalação

### Pré-requisitos
- Python 3.10 ou superior
- Pip (gerenciador de pacotes)

### Passo a Passo

1.  **Acessar a pasta do backend:**
    ```bash
    cd Backend-pcd
    ```

2.  **Criar um ambiente virtual (venv):**
    ```bash
    python -m venv venv
    ```

3.  **Ativar o ambiente virtual:**
    - **Windows:**
      ```powershell
      .\venv\Scripts\activate
      ```
    - **Linux/Mac:**
      ```bash
      source venv/bin/activate
      ```

4.  **Instalar as dependências:**
    ```bash
    pip install -r requirements.txt
    ```

5.  **Configurar variáveis de ambiente:**
    Copie o arquivo `.env.example` para um novo arquivo `.env` e ajuste as configurações se necessário.
    ```bash
    cp .env.example .env
    ```

6.  **Executar a aplicação:**
    ```bash
    uvicorn app.main:app --reload
    ```
    O servidor estará disponível em `http://localhost:8000`.

## 📂 Estrutura do Projeto

```text
app/
├── api/             # Rotas da API (deputados, votacoes, integracao, etc)
├── models/          # Modelos do SQLAlchemy (Banco de dados)
├── services/        # Lógica de negócio e integração com API externa
├── scheduler/       # Tarefas agendadas e população inicial
├── database.py      # Configuração da conexão com o banco
└── main.py          # Ponto de entrada da aplicação
data/                # Arquivos locais e banco SQLite
```

## 📡 Principais Endpoints

-   `GET /`: Health check da API.
-   `GET /api/v1/deputados`: Lista de deputados com filtros.
-   `GET /api/v1/votacoes`: Histórico de votações nominais.
-   `POST /api/integracao/sync`: Inicia a sincronização manual de dados.
-   `GET /docs`: Documentação interativa (Swagger).

## 🔄 Sincronização de Dados

Ao iniciar pela primeira vez, o backend possui uma lógica de **população inicial** que busca dados históricos (desde 2021) de forma automática. Sincronizações subsequentes podem ser disparadas via interface ou endpoints de integração.

---
Desenvolvido para promover a transparência dos dados parlamentares brasileiros.
