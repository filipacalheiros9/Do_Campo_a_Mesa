# Relatório · Do Campo à Mesa

> Máximo de 20 páginas. Apagar as notas entre parênteses retos.

## 1. Introdução
[Objetivo e âmbito do trabalho.]

## 2. Arquitetura
[Diagrama de componentes: SPA, API REST, servidor de sockets, MongoDB, storage e serviços Cloud.]

## 3. Frontend e SPA
[Framework escolhida e porquê; componentes; gestão de estado; routing; abordagem Mobile First e breakpoints.]

## 4. API REST e documentação
[Recursos, verbos e códigos de estado; ligação para a Swagger UI.]

## 5. Modelo de dados
O MongoDB contém seis coleções: `users`, `products`, `orders`, `auctions`, `bids` e
`reviews`. Os schemas Mongoose validam os campos obrigatórios, valores permitidos e
limites antes de os documentos serem gravados. O campo `passwordHash` de `users` usa
`select: false`, pelo que não é devolvido nas consultas normais nem nas respostas da API.

As linhas ficam embebidas em cada encomenda porque são poucas, são sempre lidas com a
encomenda e precisam de conservar uma cópia do nome, preço e unidade no momento da
compra. Os dados próprios da exploração também ficam embebidos no utilizador produtor,
pois formam uma relação pequena de um para um. A licitação atual fica embebida no leilão
para poder ser comparada e atualizada atomicamente.

Produtos, encomendas, leilões, licitações e avaliações referenciam utilizadores através
de `ObjectId`. As licitações completas ficam na coleção `bids`, pois um leilão pode
receber muitas e o documento do leilão não deve crescer sem limite. As avaliações ficam
em `reviews` para poderem ser consultadas por produtor e moderadas de forma independente.

Foram criados índices para emails únicos, pesquisas de produtos, encomendas por comprador
ou produtor, datas e estados dos leilões e controlo de avaliações duplicadas. As consultas
usam `$regex` para pesquisa textual, `$in` para listas e épocas, `$gte`/`$lte` para preços
e datas, `$lt`/`$gt` para o ciclo dos leilões e `$inc` para alterações atómicas de stock.
Os virtuais `Product.disponivel` e `Order.total` calculam valores derivados sem os guardar.

O comando `npm run seed`, executado na pasta `api`, repõe um conjunto coerente de dados
de demonstração: cinco utilizadores, cinco produtos, duas encomendas, três leilões, cinco
licitações e duas avaliações. As passwords são guardadas com hash bcrypt, e as datas dos
leilões são calculadas relativamente ao momento da execução. As seis coleções e as suas
referências foram confirmadas no MongoDB Atlas.

## 6. Segurança
[JWT, papéis, hash de passwords, HTTPS, gestão de segredos.]

## 7. Tempo real e consistência dos leilões
[Salas, eventos, presença; como garante que duas licitações simultâneas não são ambas aceites.]

## 8. Deployment na Cloud
[Fornecedor e serviços usados; modelo IaaS/PaaS/BaaS de cada um; custos estimados; URLs públicos.]

## 9. Dificuldades e trabalho futuro

## 10. Declaração de uso de ferramentas
[Bibliotecas e assistentes de IA utilizados, e para quê.]
