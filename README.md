# Do Campo à Mesa · código base

Mercado digital de produtores locais com leilões em tempo real.
Trabalho prático individual de **Desenvolvimento Web e para a Cloud** (MEI · IPVC–ESTG), 7 semanas.

Este repositório contém a aplicação funcional: API REST, SPA para visitantes, compradores e produtores, leilões em tempo real e backoffice Laravel para administradores.

## Aplicação publicada

- Aplicação (entrada única): https://dcm-web-fc2026.azurewebsites.net
- API: https://dcm-api-fc2026.azurewebsites.net
- Health check: https://dcm-api-fc2026.azurewebsites.net/api/health
- Swagger UI: https://dcm-api-fc2026.azurewebsites.net/api-docs
- Backoffice Laravel (endereço técnico): https://dcm-admin-fc2026.azurewebsites.net

O utilizador entra sempre pela aplicação React. Quando a API identifica o papel `admin`, a SPA transfere a sessão de forma segura e encaminha automaticamente para o backoffice Laravel, sem pedir um segundo login.
Ao sair do backoffice, as sessões Laravel e React são terminadas e o browser regressa ao catálogo público. O endereço técnico do Laravel nunca apresenta um formulário de login próprio: encaminha para o login único da SPA.
Se o browser for fechado com uma sessão válida, a aplicação recupera-a ao reabrir. Visitar `/login` já autenticado encaminha imediatamente para a área correspondente ao papel, em vez de voltar a apresentar o formulário.

Os três componentes web são executados em Azure App Service, na região Spain Central, e partilham o mesmo plano Linux B1. O MongoDB Atlas fornece a base de dados e as fotografias são guardadas no contentor `produtos` do Azure Blob Storage. A SPA foi alojada no App Service porque as regiões disponibilizadas pelo Azure Static Web Apps não coincidiam com as regiões permitidas pela subscrição Azure for Students. Todas as ligações públicas usam HTTPS; a API tem WebSockets ativos e restringe CORS ao domínio público da SPA.

## Estrutura

```
do-campo-a-mesa/
├── api/                      Node.js · Express · MongoDB · Socket.io
│   ├── openapi.yaml          Passo 5: especificação OpenAPI (Swagger UI em /api-docs)
│   ├── test/e2e.js           teste automático da API REST e do Socket.io
│   └── src/
│       ├── server.js         HTTP + Socket.io
│       ├── app.js            Express: middleware, rotas, Swagger
│       ├── config/db.js      ligação ao MongoDB
│       ├── middleware/       auth.js (JWT + papéis), errorHandler.js
│       ├── models/           User, Product, Order, Auction, Bid, Review (Passo 4)
│       ├── routes/           auth, products, producers, orders, auctions, reviews, admin (Passo 3)
│       ├── sockets/          index.js (autenticação), leiloes.js (Passo 7)
│       ├── services/         imagens.js: storage na Cloud (Passo 8)
│       └── seed/seed.js      dados de exemplo
├── web/                      React (Vite) · Bootstrap 5 · SASS
│   └── src/
│       ├── App.jsx           rotas (visitante, comprador, produtor, admin)
│       ├── api/client.js     pedidos à API com o token JWT
│       ├── context/          AuthContext, CarrinhoContext (estado global)
│       ├── hooks/            useLeilao (Socket.io), useNotificacoes
│       ├── components/       Navbar, CartaoProduto, EstadoEncomenda, RotaProtegida…
│       ├── pages/            Catalogo, Produtor, Leiloes, SalaLeilao, Carrinho, Encomendas, …
│       ├── styles/           _variables, _mixins (Mobile First), _catalogo, main.scss
│       └── data/             produtos.json: dados simulados (semana 2)
├── backoffice/               Laravel · MVC · Blade (administração)
└── docs/
    └── relatorio.md          estrutura sugerida para o relatório
```

## Pré-requisitos

- Node.js 20 ou superior
- PHP 8.2 ou superior e Composer (backoffice Laravel)
- MongoDB local, ou um cluster gratuito no [MongoDB Atlas](https://www.mongodb.com/atlas)

## Arranque

```bash
# API
cd api
cp .env.example .env          # preencher MONGODB_URI e JWT_SECRET
npm install
npm run seed                  # opcional: dados de exemplo (password: password123)
npm run dev                   # http://localhost:3000  ·  docs em /api-docs

# SPA (noutro terminal)
cd web
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173

# Backoffice Laravel (num terceiro terminal)
cd backoffice
cp .env.example .env
composer install
php artisan key:generate
php artisan serve             # http://localhost:8000
```

Com `VITE_USAR_DADOS_SIMULADOS=true`, o catálogo funciona sem API, a partir de `src/data/produtos.json`. Quando a API estiver pronta, mude para `false`.

### Utilizadores de exemplo (`npm run seed`)

Todos os utilizadores têm a password `password123`.

| Papel | Email |
|---|---|
| admin | admin@exemplo.pt |
| produtor | horta@exemplo.pt |
| produtor | mel@exemplo.pt |
| comprador | tasca@exemplo.pt |

O seed cria também 5 produtos e um leilão ativo com 30 minutos de duração.

Atenção: o seed **apaga** as coleções de utilizadores, produtos e leilões antes de inserir os dados.

### Verificar que está tudo a funcionar

| Pedido | Resposta esperada |
|---|---|
| `GET http://localhost:3000/api/health` | `200 { "estado": "ok" }` |
| `GET http://localhost:3000/api/products` | `200` com a lista de produtos |
| `http://localhost:3000/api-docs` | Swagger UI |
| `GET /api/admin/estatisticas` sem token | `401` (o middleware de autenticação está ativo) |
| `http://localhost:8000` | Login do backoffice Laravel |

### Teste automático de ponta a ponta

O teste requer MongoDB, a API ligada e os utilizadores criados pelo seed. Com a API a correr num terminal, execute noutro:

```bash
cd api
npm run seed
npm test
```

O teste usa a API REST e clientes Socket.io reais. Abrange autenticação, papéis, produtos, stock, encomendas, pagamentos, avaliações, moderação, notificações, pagamentos concorrentes e duas licitações simultâneas com o mesmo valor. A execução final contém **63 verificações** e os dados temporários criados pelo teste são removidos no final.

## Notas da implementação

### API (`api/`): Node.js · Express · MongoDB · Socket.io

**Já funciona:**

- arranque do servidor HTTP partilhado pela API REST e pelo Socket.io;
- ligação ao MongoDB, configuração por `.env` (ver `.env.example`) e tratamento centralizado de erros (`400` para validação, `500` para o resto);
- middleware `auth(...papeis)`: valida o token JWT e o papel do utilizador (`401` sem token, `403` sem permissão);
- Swagger UI em `/api-docs`, com o recurso `/products` documentado como exemplo;
- sockets: autenticação com o mesmo JWT da API, sala pessoal por utilizador, salas por leilão e contagem de participantes;
- serviço de upload de imagens para Azure Blob Storage (`services/imagens.js`);
- script `npm run seed` com dados de exemplo.

**Base para rever:**

- modelos User, Product, Order, Auction, Bid e Review, a rever no Passo 4 (embedding vs linking, índices).

As rotas de autenticação, produtos, produtores, encomendas, leilões, avaliações e administração estão implementadas.

### SPA (`web/`): React (Vite) · Bootstrap 5 · SASS

**Já funciona:**

- rotas para os 4 intervenientes (visitante, comprador, produtor, administrador), com páginas protegidas por papel (`RotaProtegida`);
- menu que se adapta ao utilizador autenticado;
- estado global da sessão (`AuthContext`) e do carrinho (`CarrinhoContext`);
- catálogo com dados simulados (pesquisa, categorias e filtro biológico); com `VITE_USAR_DADOS_SIMULADOS=false` passa a usar a API;
- ligação em tempo real à sala de leilão (hook `useLeilao`);
- SASS com as variáveis do tema, o mixin Mobile First `a-partir-de()` e a grelha do catálogo com 3 breakpoints (768, 1024 e 1280 px).

As áreas de visitante, comprador e produtor usam a API real. O administrador inicia sessão na mesma SPA e é encaminhado automaticamente para o backoffice Laravel separado.

## Funcionalidades

- catálogo com pesquisa por categoria, produtor, localidade, época e modo de produção;
- páginas públicas dos produtores com mapa, produtos e avaliações;
- carrinho, entrega ou levantamento, encomendas e acompanhamento do estado;
- checkout em dois passos com cartão ou MB WAY, sem guardar dados bancários;
- pagamento posterior das encomendas ganhas em leilão e histórico integrado nas encomendas;
- gestão de produtos, stock, preços, fotografias, perfil público e estatísticas do produtor;
- criação de leilões, licitações atómicas e notificações através de Socket.IO;
- backoffice Laravel para validação de produtores, moderação e visão global da plataforma.

## Regras do repositório

- Faça *commits* pequenos e frequentes, com mensagens claras. O histórico é considerado na avaliação.
- O ficheiro `.env` nunca vai para o Git; use `.env.example` como modelo.
- Declare no relatório as bibliotecas e os assistentes de IA que usar.
