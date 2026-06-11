# AjeX — Agile Hub

Plataforma de gestão ágil para times Scrum. Centraliza backlog, sprints, board kanban, retrospectivas, daily standup, impedimentos, roadmap, OKRs, discovery, QA, chat de time e assistente de IA local.

Stack: React + Vite + TypeScript + Tailwind (frontend) | Node + Express + Prisma + Socket.io (backend) | MySQL 8 | Ollama (IA local) | Docker Compose.

---

## Inicio rapido

Pre-requisito: Docker Desktop instalado e rodando.

```bash
docker compose up --build
```

Na primeira execucao o sistema vai baixar o modelo de IA (llama3.2:3b, ~2 GB) e popular o banco com dados de demonstracao. Aguarde todos os servicos ficarem saudaveis.

| Servico | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Ollama | http://localhost:11434 |
| MySQL | localhost:3306 |

### Login de demonstracao

```
Email:  admin@ajex.dev
Senha:  ajex123
```

---

## Comandos uteis

```bash
# Logs de um servico
docker compose logs -f backend
docker compose logs -f ollama-pull

# Rodar o seed manualmente
docker compose exec backend npm run seed

# Acessar o MySQL
docker compose exec mysql mysql -uajex -pajexpass ajex

# Testar o Ollama
curl http://localhost:11434/api/tags

# Resetar tudo (apaga dados e modelo)
docker compose down -v
docker compose up --build
```
