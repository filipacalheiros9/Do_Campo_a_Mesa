# Backoffice Laravel

Painel administrativo do projeto **Do Campo à Mesa**. Usa Laravel MVC e Blade e consome a API Express através de pedidos autenticados com JWT.

## Executar

Com a API disponível em `http://localhost:3000`:

```bash
composer install
php artisan key:generate
php artisan serve
```

O painel fica disponível em `http://localhost:8000`. A variável `API_URL` do `.env` permite alterar o endereço da API.

## Funcionalidades

- autenticação exclusiva para administradores;
- indicadores globais;
- validação de contas de produtores;
- moderação de avaliações denunciadas;
- consulta de utilizadores, encomendas e leilões.

## Testes e formatação

```bash
php artisan test
vendor/bin/pint
```
