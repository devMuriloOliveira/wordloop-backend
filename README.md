# English SaaS — Backend

API REST do **WordLoop**, aplicativo para aprender vocabulário em inglês com metas diárias, quiz e tradução integrada.

## Tecnologias

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/) 5
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [bcrypt](https://www.npmjs.com/package/bcrypt) — hash de senhas
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) — autenticação JWT
- [axios](https://www.npmjs.com/package/axios) — tradução via LibreTranslate (instâncias públicas)

## Pré-requisitos

- Node.js 20+ (recomendado 22+)
- Conta PostgreSQL (ex.: [Neon](https://neon.tech/), Supabase, local)

## Instalação

```bash
cd english-saas-backend
npm install
```

Crie o arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@host:5432/nome_do_banco?sslmode=require"
JWT_SECRET="sua_chave_secreta_forte"
```

> O `.env` não vai para o Git (está no `.gitignore`). Nunca commite senhas ou chaves reais.

Aplique as migrations e gere o client do Prisma:

```bash
npx prisma migrate dev
npx prisma generate
```

## Executar

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor com hot-reload (nodemon) — porta **3000** |
| `npm start` | Servidor em produção |
| `npm run build` | Aplica migrations em produção (`prisma migrate deploy`) |
| `npx prisma studio` | Interface visual do banco |

### Deploy (Render / produção)

No painel do serviço, configure:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

O `postinstall` roda `prisma generate` automaticamente. O `npm run build` aplica as migrations no banco (`prisma migrate deploy`).

Sem isso, rotas como `/match-pairs` e campos `correctCount` / `wrongCount` podem falhar em produção.

Após subir, a API responde em `http://localhost:3000`.

## Estrutura do projeto

```
english-saas-backend/
├── prisma/
│   ├── schema.prisma      # Modelos User e Word
│   └── migrations/
├── src/
│   ├── app.js             # Express + CORS + JSON
│   ├── server.js          # Entrada e porta
│   ├── lib/prisma.js      # Cliente Prisma
│   ├── middlewares/
│   │   └── auth.js        # JWT Bearer
│   └── routes/
│       ├── index.js
│       ├── user.routes.js
│       ├── word.routes.js
│       └── translate.routes.js
└── .env
```

## Modelo de dados

| Modelo | Campos principais |
|--------|-------------------|
| **User** | `name`, `email`, `password`, `dailyGoal`, `isVerified`, `verificationCode` |
| **Word** | `englishWord`, `portugueseWord`, `englishSentence`, `portugueseSentence`, `userId` |

## Autenticação

Rotas protegidas exigem o header:

```
Authorization: Bearer <token>
```

O token é retornado no `POST /login` e expira em **7 dias**.

## Endpoints

### Públicos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Health check |
| `POST` | `/register` | Cadastro de usuário |
| `POST` | `/login` | Login (retorna `user` + `token`) |

**`POST /register`** — body:

```json
{
  "name": "Maria",
  "email": "maria@email.com",
  "password": "senha123",
  "dailyGoal": 10
}
```

`dailyGoal` é opcional (padrão: `10`).

**`POST /login`** — body:

```json
{
  "email": "maria@email.com",
  "password": "senha123"
}
```

### Usuário (autenticado)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/profile` | Perfil completo |
| `GET` | `/me` | Dados resumidos do usuário |
| `GET` | `/dashboard` | Estatísticas (palavras, meta, progresso do dia) |
| `GET` | `/streak` | Histórico dos últimos 30 dias |
| `PUT` | `/me/daily-goal` | Atualizar meta diária |

**`PUT /me/daily-goal`** — body:

```json
{
  "dailyGoal": 15
}
```

### Palavras (autenticado)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/words` | Lista palavras do usuário |
| `POST` | `/words` | Cria palavra |
| `PUT` | `/words/:id` | Atualiza palavra |
| `DELETE` | `/words/:id` | Remove palavra |
| `GET` | `/quiz` | Palavras aleatórias para o quiz |

**`POST /words`** — body:

```json
{
  "englishWord": "apple",
  "portugueseWord": "maçã",
  "englishSentence": "I eat an apple.",
  "portugueseSentence": "Eu como uma maçã."
}
```

### Tradução (autenticado)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/translate` | Traduz texto (LibreTranslate com fallback) |

**`POST /translate`** — body:

```json
{
  "text": "Olá mundo",
  "sourceLang": "pt",
  "targetLang": "en"
}
```

Resposta:

```json
{
  "translation": "Hello world"
}
```

## CORS

CORS está habilitado para todas as origens (`cors()`), adequado para desenvolvimento com o frontend em outra porta (ex.: Vite na `5173`).

## Verificação de e-mail

O schema Prisma já possui `isVerified` e `verificationCode`. A integração com envio de e-mail está preparada no código, mas **desativada** no fluxo de registro atual. Para reativar, implemente o serviço de e-mail e descomente o trecho correspondente em `user.routes.js`.

## Frontend

O cliente Vue está em `../english-saas-frontend/WordLoop`. Veja o [README do WordLoop](../english-saas-frontend/WordLoop/README.md).

## Licença

ISC
