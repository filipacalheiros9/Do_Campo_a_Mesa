// Teste de ponta a ponta da API REST e do Socket.IO.
// Pré-condições: MongoDB e API ligados; executar `npm run seed` antes de `npm test`.
require('dotenv').config();
const { io } = require('socket.io-client');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Order = require('../src/models/Order');
const Auction = require('../src/models/Auction');
const Bid = require('../src/models/Bid');
const Review = require('../src/models/Review');

const BASE_URL = (process.env.E2E_API_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const API_URL = `${BASE_URL}/api`;
const PASSWORD = 'password123';
const TIMEOUT_MS = 7000;

let total = 0;
let passaram = 0;
const falhas = [];
const sockets = [];
const criados = {
  utilizadores: [],
  produtos: [],
  encomendas: [],
  leiloes: [],
  avaliacoes: []
};

function verificar(condicao, descricao, detalhe = '') {
  total += 1;
  if (condicao) {
    passaram += 1;
    console.log(`✓ ${descricao}`);
    return true;
  }

  falhas.push({ descricao, detalhe });
  console.error(`✗ ${descricao}${detalhe ? ` — ${detalhe}` : ''}`);
  return false;
}

function exigir(valor, mensagem) {
  if (!valor) throw new Error(mensagem);
  return valor;
}

async function pedido(caminho, { metodo = 'GET', token, corpo } = {}) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      Accept: 'application/json',
      ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });

  const texto = await resposta.text();
  let dados = null;
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = texto;
    }
  }

  return { status: resposta.status, dados, headers: resposta.headers };
}

async function login(email, password = PASSWORD) {
  return pedido('/auth/login', {
    metodo: 'POST',
    corpo: { email, password }
  });
}

function esperarEvento(socket, evento, timeout = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => {
      socket.off(evento, receber);
      reject(new Error(`Tempo excedido à espera do evento ${evento}`));
    }, timeout);

    function receber(dados) {
      clearTimeout(temporizador);
      socket.off(evento, receber);
      resolve(dados);
    }

    socket.on(evento, receber);
  });
}

function ligarSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: false,
      timeout: TIMEOUT_MS
    });
    sockets.push(socket);

    const temporizador = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Tempo excedido ao ligar o Socket.IO'));
    }, TIMEOUT_MS);

    socket.once('connect', () => {
      clearTimeout(temporizador);
      resolve(socket);
    });
    socket.once('connect_error', (erro) => {
      clearTimeout(temporizador);
      reject(erro);
    });
  });
}

function esperarErroLigacao(token) {
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      auth: { token },
      reconnection: false,
      timeout: TIMEOUT_MS
    });
    sockets.push(socket);

    const temporizador = setTimeout(() => {
      socket.disconnect();
      resolve(null);
    }, TIMEOUT_MS);

    socket.once('connect_error', (erro) => {
      clearTimeout(temporizador);
      resolve(erro);
    });
  });
}

function emitir(socket, evento, dados, timeout = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(
      () => reject(new Error(`Tempo excedido no evento ${evento}`)),
      timeout
    );

    socket.emit(evento, dados, (resposta) => {
      clearTimeout(temporizador);
      resolve(resposta);
    });
  });
}

async function limparDadosCriados() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não está definida; não foi possível limpar os dados E2E');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Review.deleteMany({ _id: { $in: criados.avaliacoes } });
    await Bid.deleteMany({ leilao: { $in: criados.leiloes } });
    await Order.deleteMany({ _id: { $in: criados.encomendas } });
    await Auction.deleteMany({ _id: { $in: criados.leiloes } });
    await Product.deleteMany({ _id: { $in: criados.produtos } });
    await User.deleteMany({ _id: { $in: criados.utilizadores } });
  } finally {
    await mongoose.disconnect();
  }
}

async function definirPagamentoDaEncomenda(encomendaId, pagamento) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI não está definida');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await Order.updateOne({ _id: encomendaId }, { $set: { pagamento } });
  } finally {
    await mongoose.disconnect();
  }
}

async function executar() {
  console.log(`\nTeste E2E em ${BASE_URL}`);
  console.log('Pré-condição: API ligada e base reposta com `npm run seed`.\n');

  const sufixo = `${Date.now()}-${process.pid}`;
  const emailProdutor = `produtor-e2e-${sufixo}@exemplo.pt`;
  const emailCompradorA = `comprador-a-e2e-${sufixo}@exemplo.pt`;
  const emailCompradorB = `comprador-b-e2e-${sufixo}@exemplo.pt`;

  const health = await pedido('/health');
  verificar(health.status === 200 && health.dados?.estado === 'ok', 'health check -> 200');

  const historicoLeiloes = await pedido('/auctions?estado=terminado');
  verificar(
    historicoLeiloes.status === 200
      && historicoLeiloes.dados?.length > 0
      && historicoLeiloes.dados.every((leilao) => leilao.encomenda),
    'leilões históricos do seed já têm encomenda associada'
  );

  const loginErrado = await login('admin@exemplo.pt', 'password-errada');
  verificar(loginErrado.status === 401, 'login com password errada -> 401');

  const admin = await login('admin@exemplo.pt');
  verificar(admin.status === 200 && admin.dados?.utilizador?.papel === 'admin', 'login de administrador');
  const tokenAdmin = exigir(admin.dados?.token, 'Execute `npm run seed`: administrador de teste não encontrado.');

  const produtorExistente = await login('horta@exemplo.pt');
  verificar(
    produtorExistente.status === 200 && produtorExistente.dados?.utilizador?.papel === 'produtor',
    'login de produtor validado'
  );
  const tokenOutroProdutor = exigir(produtorExistente.dados?.token, 'Produtor do seed não encontrado.');

  const registoProdutor = await pedido('/auth/registo', {
    metodo: 'POST',
    corpo: {
      nome: 'Produtor E2E',
      email: emailProdutor,
      password: PASSWORD,
      papel: 'produtor',
      produtor: {
        nomeExploracao: 'Exploração E2E',
        localidade: 'Viana do Castelo',
        codigoPostal: '4900-001'
      }
    }
  });
  verificar(registoProdutor.status === 201 && registoProdutor.dados?.id, 'registo de produtor -> 201');
  const produtorId = exigir(registoProdutor.dados?.id, 'Não foi possível criar o produtor E2E.');
  criados.utilizadores.push(produtorId);

  const loginPendente = await login(emailProdutor);
  verificar(loginPendente.status === 403, 'produtor pendente não consegue iniciar sessão -> 403');

  const pendentes = await pedido('/admin/produtores/pendentes', { token: tokenAdmin });
  verificar(
    pendentes.status === 200 && pendentes.dados?.some((item) => item._id === produtorId),
    'administrador vê o produtor pendente'
  );

  const aprovacao = await pedido(`/admin/produtores/${produtorId}/validacao`, {
    metodo: 'PATCH',
    token: tokenAdmin,
    corpo: { aprovado: true }
  });
  verificar(aprovacao.status === 200 && aprovacao.dados?.produtor?.validado === true, 'administrador aprova produtor');

  const produtor = await login(emailProdutor);
  verificar(produtor.status === 200 && produtor.dados?.utilizador?.papel === 'produtor', 'produtor aprovado inicia sessão');
  const tokenProdutor = exigir(produtor.dados?.token, 'Login do produtor E2E falhou.');

  for (const [nome, email] of [
    ['Comprador A E2E', emailCompradorA],
    ['Comprador B E2E', emailCompradorB]
  ]) {
    const registo = await pedido('/auth/registo', {
      metodo: 'POST',
      corpo: { nome, email, password: PASSWORD, papel: 'comprador' }
    });
    verificar(registo.status === 201 && registo.dados?.id, `registo de ${nome} -> 201`);
    if (registo.dados?.id) criados.utilizadores.push(registo.dados.id);
  }

  const compradorA = await login(emailCompradorA);
  const compradorB = await login(emailCompradorB);
  verificar(compradorA.status === 200, 'login do comprador A');
  verificar(compradorB.status === 200, 'login do comprador B');
  const tokenA = exigir(compradorA.dados?.token, 'Login do comprador A falhou.');
  const tokenB = exigir(compradorB.dados?.token, 'Login do comprador B falhou.');

  const sessao = await pedido('/auth/eu', { token: tokenA });
  verificar(sessao.status === 200 && sessao.dados?.email === emailCompradorA, 'JWT permite consultar a sessão');

  const produtoCriado = await pedido('/products', {
    metodo: 'POST',
    token: tokenProdutor,
    corpo: {
      nome: `Produto E2E ${sufixo}`,
      categoria: 'Hortícolas',
      preco: 2,
      unidade: 'kg',
      stock: 5,
      biologico: true,
      epocas: ['Outono']
    }
  });
  verificar(produtoCriado.status === 201 && produtoCriado.dados?._id, 'produtor cria produto -> 201');
  const produtoId = exigir(produtoCriado.dados?._id, 'Não foi possível criar o produto E2E.');
  criados.produtos.push(produtoId);

  const pesquisa = await pedido(`/products?q=${encodeURIComponent(`Produto E2E ${sufixo}`)}&categoria=Hortícolas`);
  verificar(
    pesquisa.status === 200 && pesquisa.dados?.some((item) => item._id === produtoId),
    'pesquisa por texto e categoria encontra o produto'
  );

  const filtroPreco = await pedido('/products?precoMax=2&ordenar=preco_asc');
  verificar(
    filtroPreco.status === 200
      && filtroPreco.dados.every((item) => item.preco <= 2)
      && filtroPreco.dados.every((item, indice, lista) => indice === 0 || lista[indice - 1].preco <= item.preco),
    'filtro $lte e ordenação por preço'
  );

  const intervaloInvalido = await pedido('/products?precoMin=10&precoMax=5');
  verificar(intervaloInvalido.status === 400, 'intervalo de preços inválido -> 400');

  const alteracaoAlheia = await pedido(`/products/${produtoId}`, {
    metodo: 'PUT',
    token: tokenOutroProdutor,
    corpo: { nome: 'Tentativa indevida' }
  });
  verificar(alteracaoAlheia.status === 403, 'outro produtor não pode alterar o produto -> 403');

  const alteracaoPropria = await pedido(`/products/${produtoId}`, {
    metodo: 'PUT',
    token: tokenProdutor,
    corpo: { preco: 2.5 }
  });
  verificar(alteracaoPropria.status === 200 && alteracaoPropria.dados?.preco === 2.5, 'produtor altera o próprio produto');

  const semStock = await pedido('/orders', {
    metodo: 'POST',
    token: tokenA,
    corpo: {
      linhas: [{ produto: produtoId, quantidade: 6 }],
      entrega: { tipo: 'levantamento' },
      pagamento: { metodo: 'cartao' }
    }
  });
  verificar(semStock.status === 409, 'stock insuficiente -> 409');

  const produtoAposFalha = await pedido(`/products/${produtoId}`);
  verificar(produtoAposFalha.dados?.stock === 5, 'stock permanece intacto após encomenda recusada');

  const encomendaCriada = await pedido('/orders', {
    metodo: 'POST',
    token: tokenA,
    corpo: {
      linhas: [{ produto: produtoId, quantidade: 2 }],
      entrega: { tipo: 'levantamento' },
      pagamento: { metodo: 'mbway' }
    }
  });
  verificar(
    encomendaCriada.status === 201 && encomendaCriada.dados?.total === 5,
    'encomenda válida -> 201 e total calculado pelo servidor'
  );
  const encomendaId = exigir(encomendaCriada.dados?._id, 'Não foi possível criar a encomenda E2E.');
  criados.encomendas.push(encomendaId);
  verificar(
    encomendaCriada.dados?.pagamento?.estado === 'pago'
      && encomendaCriada.dados?.pagamento?.metodo === 'mbway'
      && /^PAG-\d{8}-[A-F0-9]{8}$/.test(encomendaCriada.dados?.pagamento?.referencia || ''),
    'checkout guarda apenas método, estado e referência do pagamento'
  );

  const pagamentoDuplicado = await pedido(`/orders/${encomendaId}/pagamento`, {
    metodo: 'POST', token: tokenA, corpo: { metodo: 'cartao' }
  });
  verificar(pagamentoDuplicado.status === 409, 'pagamento aprovado não pode ser duplicado -> 409');

  const produtoReservado = await pedido(`/products/${produtoId}`);
  verificar(produtoReservado.dados?.stock === 3, 'stock reservado de forma atómica (5 -> 3)');

  const encomendasComprador = await pedido('/orders', { token: tokenA });
  verificar(
    encomendasComprador.status === 200
      && encomendasComprador.dados?.some((item) => item._id === encomendaId),
    'comprador consulta as próprias encomendas'
  );

  const encomendaAlheia = await pedido(`/orders/${encomendaId}`, { token: tokenB });
  verificar(encomendaAlheia.status === 403, 'outro comprador não acede à encomenda -> 403');

  const encomendasProdutor = await pedido('/orders', { token: tokenProdutor });
  verificar(
    encomendasProdutor.status === 200
      && encomendasProdutor.dados?.some((item) => item._id === encomendaId),
    'produtor consulta as encomendas recebidas'
  );

  // Reabre apenas o pagamento do registo E2E para validar o fluxo usado pelas
  // encomendas de leilão, que nascem por pagar.
  await definirPagamentoDaEncomenda(encomendaId, { estado: 'por_pagar' });

  const confirmacaoSemPagamento = await pedido(`/orders/${encomendaId}/estado`, {
    metodo: 'PATCH', token: tokenProdutor, corpo: { estado: 'confirmada' }
  });
  verificar(confirmacaoSemPagamento.status === 409, 'produtor não confirma encomenda por pagar -> 409');

  const pagamentoAlheio = await pedido(`/orders/${encomendaId}/pagamento`, {
    metodo: 'POST', token: tokenB, corpo: { metodo: 'cartao' }
  });
  verificar(pagamentoAlheio.status === 403, 'comprador não paga encomenda de terceiros -> 403');

  const metodoInvalido = await pedido(`/orders/${encomendaId}/pagamento`, {
    metodo: 'POST', token: tokenA, corpo: { metodo: 'dinheiro' }
  });
  verificar(metodoInvalido.status === 400, 'método de pagamento inválido -> 400');

  const [tentativaPagamentoA, tentativaPagamentoB] = await Promise.all([
    pedido(`/orders/${encomendaId}/pagamento`, {
      metodo: 'POST', token: tokenA, corpo: { metodo: 'cartao' }
    }),
    pedido(`/orders/${encomendaId}/pagamento`, {
      metodo: 'POST', token: tokenA, corpo: { metodo: 'mbway' }
    })
  ]);
  const pagamentosAceites = [tentativaPagamentoA, tentativaPagamentoB]
    .filter((tentativa) => tentativa.status === 200);
  const pagamentosRejeitados = [tentativaPagamentoA, tentativaPagamentoB]
    .filter((tentativa) => tentativa.status === 409);
  verificar(
    pagamentosAceites.length === 1
      && pagamentosRejeitados.length === 1
      && pagamentosAceites[0].dados?.pagamento?.estado === 'pago',
    'dois pagamentos simultâneos: apenas um é aceite'
  );

  const estadoAdiantado = await pedido(`/orders/${encomendaId}/estado`, {
    metodo: 'PATCH',
    token: tokenProdutor,
    corpo: { estado: 'pronta' }
  });
  verificar(estadoAdiantado.status === 409, 'estado da encomenda não pode saltar etapas -> 409');

  const socketA = await ligarSocket(tokenA);
  verificar(socketA.connected, 'comprador liga ao Socket.IO com JWT');

  const notificacaoConfirmada = esperarEvento(socketA, 'encomenda-atualizada');
  const confirmada = await pedido(`/orders/${encomendaId}/estado`, {
    metodo: 'PATCH',
    token: tokenProdutor,
    corpo: { estado: 'confirmada' }
  });
  const eventoConfirmada = await notificacaoConfirmada;
  verificar(confirmada.status === 200 && confirmada.dados?.estado === 'confirmada', 'produtor confirma a encomenda');
  verificar(
    String(eventoConfirmada?.id) === encomendaId && eventoConfirmada?.estado === 'confirmada',
    'comprador recebe atualização da encomenda em tempo real'
  );

  for (const estado of ['pronta', 'entregue']) {
    const atualizacao = await pedido(`/orders/${encomendaId}/estado`, {
      metodo: 'PATCH',
      token: tokenProdutor,
      corpo: { estado }
    });
    verificar(atualizacao.status === 200 && atualizacao.dados?.estado === estado, `encomenda passa para ${estado}`);
  }

  const classificacaoInvalida = await pedido('/reviews', {
    metodo: 'POST',
    token: tokenA,
    corpo: { encomenda: encomendaId, classificacao: 6 }
  });
  verificar(classificacaoInvalida.status === 400, 'classificação inválida -> 400');

  const avaliacaoProdutor = await pedido('/reviews', {
    metodo: 'POST',
    token: tokenA,
    corpo: { encomenda: encomendaId, classificacao: 5, comentario: 'Produtor E2E' }
  });
  verificar(avaliacaoProdutor.status === 201, 'comprador avalia o produtor -> 201');
  if (avaliacaoProdutor.dados?._id) criados.avaliacoes.push(avaliacaoProdutor.dados._id);

  const avaliacaoProdutorDuplicada = await pedido('/reviews', {
    metodo: 'POST',
    token: tokenA,
    corpo: { encomenda: encomendaId, classificacao: 4 }
  });
  verificar(avaliacaoProdutorDuplicada.status === 409, 'não avalia o produtor duas vezes -> 409');

  const avaliacaoProduto = await pedido('/reviews', {
    metodo: 'POST',
    token: tokenA,
    corpo: { encomenda: encomendaId, produto: produtoId, classificacao: 4, comentario: 'Produto E2E' }
  });
  verificar(avaliacaoProduto.status === 201 && avaliacaoProduto.dados?._id, 'comprador avalia o produto -> 201');
  const avaliacaoProdutoId = exigir(avaliacaoProduto.dados?._id, 'Não foi possível criar a avaliação E2E.');
  criados.avaliacoes.push(avaliacaoProdutoId);

  const avaliacaoProdutoDuplicada = await pedido('/reviews', {
    metodo: 'POST',
    token: tokenA,
    corpo: { encomenda: encomendaId, produto: produtoId, classificacao: 3 }
  });
  verificar(avaliacaoProdutoDuplicada.status === 409, 'não avalia o produto duas vezes -> 409');

  const denuncia = await pedido(`/reviews/${avaliacaoProdutoId}/denuncia`, {
    metodo: 'POST',
    token: tokenB
  });
  const denunciaRepetida = await pedido(`/reviews/${avaliacaoProdutoId}/denuncia`, {
    metodo: 'POST',
    token: tokenB
  });
  verificar(denuncia.status === 204 && denunciaRepetida.status === 204, 'denúncia repetida é idempotente');

  const moderacao = await pedido('/admin/reviews/moderacao', { token: tokenAdmin });
  const denunciada = moderacao.dados?.find((item) => item._id === avaliacaoProdutoId);
  verificar(
    moderacao.status === 200 && denunciada?.denuncias === 1,
    'administrador vê uma única denúncia para moderação'
  );

  const recusada = await pedido(`/admin/reviews/${avaliacaoProdutoId}`, {
    metodo: 'PATCH',
    token: tokenAdmin,
    corpo: { estado: 'recusada' }
  });
  verificar(
    recusada.status === 200 && recusada.dados?.visivel === false,
    'administrador recusa e oculta a avaliação'
  );

  const avaliacoesPublicas = await pedido(`/reviews?produto=${produtoId}`);
  verificar(
    avaliacoesPublicas.status === 200
      && !avaliacoesPublicas.dados?.some((item) => item._id === avaliacaoProdutoId),
    'avaliação recusada deixa de ser pública'
  );

  const inicio = new Date(Date.now() - 1000).toISOString();
  const leilaoCriado = await pedido('/auctions', {
    metodo: 'POST',
    token: tokenProdutor,
    corpo: {
      lote: `Lote concorrente E2E ${sufixo}`,
      quantidade: '1 lote',
      precoBase: 100,
      incremento: 5,
      iniciaEm: inicio,
      duracaoMinutos: 10
    }
  });
  verificar(
    leilaoCriado.status === 201 && leilaoCriado.dados?.estado === 'ativo',
    'produtor cria leilão ativo -> 201'
  );
  const leilaoId = exigir(leilaoCriado.dados?._id, 'Não foi possível criar o leilão E2E.');
  criados.leiloes.push(leilaoId);

  const erroSocket = await esperarErroLigacao('token-invalido');
  verificar(erroSocket?.message === 'não autorizado', 'Socket.IO rejeita JWT inválido');

  const socketB = await ligarSocket(tokenB);
  const socketProdutor = await ligarSocket(tokenProdutor);
  verificar(socketB.connected, 'segundo comprador liga ao Socket.IO');

  const estadoA = esperarEvento(socketA, 'estado');
  socketA.emit('entrar', leilaoId);
  const estadoB = esperarEvento(socketB, 'estado');
  socketB.emit('entrar', leilaoId);
  const [salaA, salaB] = await Promise.all([estadoA, estadoB]);
  verificar(
    String(salaA?.leilao?._id) === leilaoId && String(salaB?.leilao?._id) === leilaoId,
    'dois compradores entram na mesma sala de leilão'
  );

  const licitacaoProdutor = await emitir(socketProdutor, 'licitar', { leilaoId, valor: 105 });
  verificar(licitacaoProdutor?.ok === false, 'produtor não pode licitar');

  const licitacaoBaixa = await emitir(socketA, 'licitar', { leilaoId, valor: 100 });
  verificar(licitacaoBaixa?.ok === false, 'licitação abaixo do mínimo é recusada');

  const eventoA = esperarEvento(socketA, 'nova-licitacao');
  const eventoB = esperarEvento(socketB, 'nova-licitacao');
  const [respostaA, respostaB] = await Promise.all([
    emitir(socketA, 'licitar', { leilaoId, valor: 105 }),
    emitir(socketB, 'licitar', { leilaoId, valor: 105 })
  ]);
  const aceites = [respostaA, respostaB].filter((resposta) => resposta?.ok);
  verificar(aceites.length === 1, 'duas licitações simultâneas de 105 €: só UMA é aceite');

  const [novaA, novaB] = await Promise.all([eventoA, eventoB]);
  verificar(
    novaA?.valor === 105 && novaB?.valor === 105,
    'a licitação aceite é difundida aos dois compradores'
  );

  const leilaoAposConcorrencia = await pedido(`/auctions/${leilaoId}`);
  verificar(
    leilaoAposConcorrencia.status === 200
      && leilaoAposConcorrencia.dados?.leilao?.licitacaoAtual?.valor === 105
      && leilaoAposConcorrencia.dados?.leilao?.numLicitacoes === 1,
    'estado do leilão permanece consistente após concorrência'
  );

  const licitacoesAposConcorrencia = await pedido(`/auctions/${leilaoId}/bids`);
  verificar(
    licitacoesAposConcorrencia.status === 200
      && licitacoesAposConcorrencia.dados?.length === 1
      && licitacoesAposConcorrencia.dados[0]?.valor === 105,
    'uma licitação aceite corresponde a um único registo Bid'
  );

  const proximoEvento = esperarEvento(socketA, 'nova-licitacao');
  const proximaLicitacao = await emitir(socketB, 'licitar', { leilaoId, valor: 110 });
  const proximaDifundida = await proximoEvento;
  verificar(proximaLicitacao?.ok === true, 'licitação seguinte respeita o incremento');
  verificar(proximaDifundida?.valor === 110, 'licitação seguinte é difundida em tempo real');

  const licitacoesFinais = await pedido(`/auctions/${leilaoId}/bids`);
  verificar(
    licitacoesFinais.status === 200
      && licitacoesFinais.dados?.length === 2
      && licitacoesFinais.dados[0]?.valor === 110
      && licitacoesFinais.dados[1]?.valor === 105,
    'histórico final contém apenas as duas licitações aceites e está ordenado'
  );

  const servicos = await pedido('/admin/servicos', { token: tokenAdmin });
  verificar(
    servicos.status === 200
      && servicos.dados?.find((servico) => servico.id === 'socket')?.operacional === true,
    'painel administrativo confirma Socket.IO operacional'
  );
}

async function main() {
  try {
    await executar();
  } catch (erro) {
    falhas.push({ descricao: 'execução interrompida', detalhe: erro.message });
    console.error(`\nErro fatal: ${erro.message}`);
    if (erro.cause) console.error(erro.cause);
  } finally {
    sockets.forEach((socket) => socket.disconnect());
    try {
      await limparDadosCriados();
      console.log('Dados temporários do teste removidos.');
    } catch (erroLimpeza) {
      falhas.push({ descricao: 'limpeza dos dados E2E', detalhe: erroLimpeza.message });
      console.error(`Falha ao limpar os dados E2E: ${erroLimpeza.message}`);
    }
  }

  console.log(`\n${passaram} / ${total} verificações passaram.`);
  if (falhas.length) {
    console.error('\nFalhas:');
    falhas.forEach(({ descricao, detalhe }) => {
      console.error(`- ${descricao}${detalhe ? `: ${detalhe}` : ''}`);
    });
    process.exitCode = 1;
  } else {
    console.log('Todos os testes passaram.');
  }
}

main();
