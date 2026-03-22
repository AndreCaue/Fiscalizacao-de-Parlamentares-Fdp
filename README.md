# 🇧🇷 VotaBrasil

> Visualização de votações de deputados brasileiros com dados públicos da API da Câmara dos Deputados.

---

## 📸 Funcionalidades

| Tela | Descrição |
|------|-----------|
| **Home** | Votações recentes + botão de sincronização |
| **Votações** | Lista paginada com filtro por data |
| **Detalhe da Votação** | Todos os deputados com voto colorido, resumo gráfico |
| **Deputados** | Lista com busca por nome, partido e estado |
| **Perfil do Deputado** | Histórico completo de votos + estatísticas |
| **Grafo** | Visualização React Flow: Partido → Deputado, colorido por voto |

### Paleta de votos
| Voto | Cor |
|------|-----|
| ✅ SIM | Verde `#22c55e` |
| ❌ NÃO | Vermelho `#ef4444` |
| 🔵 ABSTENÇÃO | Azul `#3b82f6` |
| 🟡 OBSTRUÇÃO | Âmbar `#f59e0b` |

---

## 🛠 Stack

### Backend
- **NestJS** + TypeScript (arquitetura modular)
- **Prisma ORM** com SQLite (dev) / PostgreSQL (prod)
- **Cron jobs** para sincronização automática diária
- **Swagger** em `/api/docs`

### Frontend
- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS** — tema dark personalizado
- **React Flow** — visualização de grafos
- **Axios** — consumo da API

### Infra
- **Docker Compose** com PostgreSQL + Redis + Backend + Frontend
- **API pública** da Câmara dos Deputados

---

## 🚀 Início rápido (Dev local)

### Pré-requisitos
- Node.js 20+
- npm 9+

### Setup automático
```bash
git clone <repo>
cd vota-brasil
chmod +x setup-dev.sh
./setup-dev.sh
```

### Setup manual

**1. Backend**
```bash
cd backend

# Copiar variáveis de ambiente
cp .env.example .env

# Instalar dependências
npm install

# Gerar cliente Prisma + criar banco SQLite
npx prisma generate
npx prisma migrate dev --name init

# Iniciar em modo desenvolvimento
npm run start:dev
```

**2. Frontend**
```bash
cd frontend

# Copiar variáveis de ambiente
cp .env.example .env.local

# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev
```

### URLs
| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001 |
| Swagger | http://localhost:3001/api/docs |
| Prisma Studio | `npx prisma studio` (na pasta backend) |

---

## 🐳 Docker (Produção)

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Parar
docker-compose down
```

---

## 📡 Endpoints da API

### Deputados
```
GET  /api/deputados                  — Lista paginada (filtros: partido, estado)
GET  /api/deputados/:id              — Detalhe do deputado
GET  /api/deputados/:id/votos        — Histórico de votos
GET  /api/deputados/:id/estatisticas — Percentuais por tipo de voto
```

### Votações
```
GET  /api/votacoes                   — Lista paginada (filtros: tipo, data)
GET  /api/votacoes/recentes          — Últimas N votações
GET  /api/votacoes/:id               — Detalhe da votação
GET  /api/votacoes/:id/votos         — Todos os votos com deputado+partido
GET  /api/votacoes/:id/resumo        — Contagem SIM/NÃO/ABSTENÇÃO/OBSTRUÇÃO
GET  /api/votacoes/:id/grafo         — Dados para React Flow (nodes + edges)
GET  /api/votacoes/:id/por-partido   — Votos agrupados por partido
```

### Partidos
```
GET  /api/partidos                   — Lista todos os partidos
GET  /api/partidos/:id               — Detalhe do partido
GET  /api/partidos/:id/deputados     — Deputados do partido
```

### Integração (sincronização)
```
POST /api/integracao/sync/completo          — Sync completo (partidos+deps+votações+votos)
POST /api/integracao/sync/partidos          — Só partidos
POST /api/integracao/sync/deputados         — Só deputados
POST /api/integracao/sync/votacoes          — Votações recentes
POST /api/integracao/sync/votos/:votacaoId  — Votos de uma votação específica
GET  /api/integracao/logs                   — Histórico de sincronizações
GET  /api/integracao/status                 — Status e agendamentos
```

---

## 🗄 Modelo de dados (Prisma)

```
Partido ──< Deputado ──< Voto >── Votacao
                └──< Lideranca
```

### Cron jobs automáticos
| Job | Horário | O que faz |
|-----|---------|-----------|
| Sync diário | 06:00 (Brasília) | Votações dos últimos 3 dias |
| Sync semanal | Domingo 03:00 | Sync completo (7 dias) |

---

## 📁 Estrutura do projeto

```
vota-brasil/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── deputados/      — Controller, Service, DTO
│   │   │   ├── partidos/       — Controller, Service
│   │   │   ├── votacoes/       — Controller, Service (incl. grafo)
│   │   │   ├── votos/          — Controller, Service
│   │   │   └── integracao/     — CamaraApiService, IntegracaoService, SyncService (cron)
│   │   ├── prisma/             — PrismaService (global)
│   │   ├── app.module.ts
│   │   └── main.ts             — Bootstrap, Swagger, CORS
│   └── prisma/
│       └── schema.prisma       — Models: Partido, Deputado, Votacao, Voto, Lideranca, SyncLog
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx             — Home
│       │   ├── votacoes/
│       │   │   ├── page.tsx         — Lista de votações
│       │   │   └── [id]/page.tsx    — Detalhe da votação
│       │   ├── deputados/
│       │   │   ├── page.tsx         — Lista de deputados
│       │   │   └── [id]/page.tsx    — Perfil do deputado
│       │   └── grafo/
│       │       └── page.tsx         — Visualização de grafo
│       ├── components/
│       │   └── grafo/
│       │       └── GrafoCanvas.tsx  — React Flow com nodes customizados
│       ├── services/
│       │   └── api.ts               — Todos os serviços HTTP
│       └── types/
│           └── index.ts             — Tipos TypeScript + helpers de cor
│
├── docker-compose.yml
├── setup-dev.sh
└── README.md
```

---

## 🔮 Próximos passos (fora de escopo atual)

- [ ] Filtro por partido no grafo
- [ ] Comparação entre dois deputados
- [ ] Histórico de alinhamento parlamentar
- [ ] Identificação de bancadas temáticas
- [ ] Análise de divergência dentro do partido
- [ ] Autenticação e favoritos
- [ ] Export de dados em CSV/JSON

---

## 📜 Licença

MIT — Dados fornecidos pela [API pública da Câmara dos Deputados](https://dadosabertos.camara.leg.br).
