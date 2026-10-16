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
O Socket.IO usa uma sala `leilao:<id>` por leilão e uma sala pessoal `user:<id>` por
utilizador. A tabela seguinte define o contrato de eventos entre a SPA e o servidor:

| Direção | Evento | Dados | Quando |
|---|---|---|---|
| Cliente → servidor | `entrar` / `sair` | `leilaoId` | Abrir ou sair da sala do leilão |
| Cliente → servidor | `licitar` | `{ leilaoId, valor }` e confirmação opcional | Comprador carrega em Licitar |
| Servidor → socket | `estado` | `{ agora, leilao, licitacoes }` | Ao entrar na sala |
| Servidor → socket | `recusada` | mensagem com o motivo | Licitação inválida |
| Servidor → sala | `presenca` | número de participantes | Alguém entra ou sai |
| Servidor → sala | `nova-licitacao` | `{ valor, nome, createdAt, numLicitacoes }` | Licitação aceite |
| Servidor → sala | `aberto` / `terminado` | `{ id }` / `{ vencedor, valor }` | Início ou fim do leilão |
| Servidor → `user:<id>` | `encomenda-atualizada` | `{ id, estado, produtor }` | Produtor muda o estado |
| Servidor → `user:<id>` | `nova-encomenda` | `{ id, total }` | Comprador cria uma encomenda |
| Servidor → `user:<id>` | `leilao-ganho` / `leilao-terminado` | `{ lote, valor, encomenda }` | Fim do leilão |
| Servidor → `user:<id>` | `conta-validada` | `{ aprovado }` | Administrador altera a validação do produtor |

Cada ligação autenticada entra automaticamente na sala pessoal do utilizador. Ao abrir
um leilão, o socket entra também em `leilao:<id>`. A presença corresponde ao número de
sockets nessa sala e é emitida novamente sempre que alguém entra, sai ou perde a ligação.
Por isso, duas janelas do mesmo utilizador contam como duas presenças. Depois de uma
reconexão, a SPA volta a emitir `entrar` e recupera o estado atual e as últimas vinte
licitações.

O servidor é a fonte da verdade para as licitações. A verificação do estado, da data de
fim e do valor mínimo faz parte do filtro de uma única operação
`Auction.findOneAndUpdate()`. A atualização da licitação atual e o incremento de
`numLicitacoes` acontecem atomicamente no MongoDB. Se dois compradores enviarem o mesmo
valor ao mesmo tempo, a primeira operação altera o valor atual; quando a segunda for
avaliada, a condição do filtro já não se verifica e essa licitação é recusada. Apenas
depois de a operação ser aceite é criado o documento `Bid` e emitido
`nova-licitacao` para a sala.

A API envia a hora do servidor no evento `estado`. O cliente calcula a diferença para o
seu relógio local e aplica esse desvio à contagem decrescente, mantendo o tempo restante
coerente entre dispositivos. Um ciclo executado de dois em dois segundos abre e fecha os
leilões com atualizações condicionadas pelo estado anterior. No fim, um índice único pelo
leilão impede a criação de duas encomendas para o mesmo vencedor.

## 8. Deployment na Cloud
[Fornecedor e serviços usados; modelo IaaS/PaaS/BaaS de cada um; custos estimados; URLs públicos.]

## 9. Dificuldades e trabalho futuro

## 10. Declaração de uso de ferramentas
[Bibliotecas e assistentes de IA utilizados, e para quê.]
