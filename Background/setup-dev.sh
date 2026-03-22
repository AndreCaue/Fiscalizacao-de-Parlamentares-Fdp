#!/bin/bash
# setup-dev.sh — Configura o ambiente de desenvolvimento do VotaBrasil
set -e

VERDE='\033[0;32m'
AMARELO='\033[1;33m'
NC='\033[0m'

echo -e "${AMARELO}"
echo "██╗   ██╗ ██████╗ ████████╗ █████╗ "
echo "██║   ██║██╔═══██╗╚══██╔══╝██╔══██╗"
echo "██║   ██║██║   ██║   ██║   ███████║"
echo "╚██╗ ██╔╝██║   ██║   ██║   ██╔══██║"
echo " ╚████╔╝ ╚██████╔╝   ██║   ██║  ██║"
echo "  ╚═══╝   ╚═════╝    ╚═╝   ╚═╝  ╚═╝"
echo -e "${AZUL}  Brasil — Transparência nas votações${NC}"
echo ""

echo -e "${VERDE}[1/5] Configurando variáveis de ambiente...${NC}"
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "  ✅ backend/.env criado"
else
  echo "  ℹ️  backend/.env já existe"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  echo "  ✅ frontend/.env.local criado"
else
  echo "  ℹ️  frontend/.env.local já existe"
fi

echo -e "${VERDE}[2/5] Instalando dependências do backend...${NC}"
cd backend
npm install
echo "  ✅ Backend: node_modules instalado"

echo -e "${VERDE}[3/5] Configurando banco de dados (SQLite)...${NC}"
npx prisma generate
npx prisma migrate dev --name init
echo "  ✅ Banco de dados criado (dev.db)"
cd ..

echo -e "${VERDE}[4/5] Instalando dependências do frontend...${NC}"
cd frontend
npm install
echo "  ✅ Frontend: node_modules instalado"
cd ..

echo ""
echo -e "${AMARELO}════════════════════════════════════════${NC}"
echo -e "${VERDE}✅ Setup concluído! Para iniciar:${NC}"
echo ""
echo -e "  ${AZUL}Terminal 1 — Backend:${NC}"
echo "    cd backend && npm run start:dev"
echo ""
echo -e "  ${AZUL}Terminal 2 — Frontend:${NC}"
echo "    cd frontend && npm run dev"
echo ""
echo -e "  ${AZUL}URLs:${NC}"
echo "    Frontend:  http://localhost:3000"
echo "    Backend:   http://localhost:3001"
echo "    Swagger:   http://localhost:3001/api/docs"
echo ""
echo -e "  ${AZUL}Primeiro acesso:${NC}"
echo "    1. Abra http://localhost:3000"
echo "    2. Clique em 'Sincronizar dados'"
echo "    3. Aguarde (~1-2 min) — dados da API da Câmara serão carregados"
echo -e "${AMARELO}════════════════════════════════════════${NC}"
