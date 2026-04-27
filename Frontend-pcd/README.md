# 🎨 FdP - Frontend (Next.js)

Este é o frontend do projeto **Fiscalização de Parlamentares (FdP)**, uma aplicação web interativa construída para facilitar a visualização de dados legislativos brasileiros.

## 🚀 Tecnologias Utilizadas

-   **[Next.js](https://nextjs.org/):** Framework React com suporte a App Router e Server Components.
-   **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e produtividade.
-   **[TailwindCSS](https://tailwindcss.com/):** Estilização baseada em utilitários com tema dark personalizado.
-   **[Shadcn/UI](https://ui.shadcn.com/):** Componentes de interface acessíveis e elegantes.
-   **[Lucide React](https://lucide.dev/):** Conjunto de ícones vetoriais modernos.
-   **[Framer Motion](https://www.framer.com/motion/):** Biblioteca para animações fluidas e interações.
-   **[Axios](https://axios-http.com/):** Cliente HTTP para consumo da API do backend.

## 🛠️ Configuração e Instalação

### Pré-requisitos
- Node.js 18 ou superior
- npm ou yarn

### Passo a Passo

1.  **Acessar a pasta do frontend:**
    ```bash
    cd Frontend-pcd/how-do-you-vote-deputy
    ```

2.  **Instalar as dependências:**
    ```bash
    npm install
    ```

3.  **Configurar variáveis de ambiente:**
    Copie o arquivo `.env.example` para um novo arquivo `.env` e aponte para a URL do seu backend.
    ```bash
    cp .env.example .env
    ```
    *Nota: Por padrão, a API espera `http://localhost:8000` (ou a porta configurada no backend).*

4.  **Executar em modo de desenvolvimento:**
    ```bash
    npm run dev
    ```
    A aplicação estará disponível em `http://localhost:3000`.

## 📂 Estrutura do Projeto

```text
app/                 # Rotas da aplicação (App Router)
components/          # Componentes React reutilizáveis
├── ui/              # Componentes base do Shadcn/UI
├── grafo/           # Visualizações de grafos de votação
hooks/               # Custom hooks do React
lib/                 # Configurações de bibliotecas (utils, fonts)
services/            # Chamadas de API (Axios services)
types/               # Definições de interfaces TypeScript
public/              # Ativos estáticos (imagens, ícones)
```

## ✨ Funcionalidades

-   **Dashboard de Votações:** Lista das sessões mais recentes da Câmara.
-   **Visualização de Votos:** Detalhamento colorido por tipo de voto (Sim, Não, Abstenção, Obstrução).
-   **Busca de Deputados:** Filtros por partido, estado e nome.
-   **Perfis Detalhados:** Histórico de votação e estatísticas de presença/voto.
-   **Sincronização Direta:** Interface para disparar atualizações de dados no backend.

---
Interface focada em usabilidade e transparência pública.
