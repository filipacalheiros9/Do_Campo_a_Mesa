const Auction = require('../models/Auction');
const Order = require('../models/Order');
const Product = require('../models/Product');

const sala = (leilaoId) => `leilao:${leilaoId}`;

async function abrirAgendados(io, agora = new Date()) {
  while (true) {
    // O estado anterior faz com que apenas uma instância consiga abrir cada leilão.
    const leilao = await Auction.findOneAndUpdate(
      { estado: 'agendado', iniciaEm: { $lte: agora } },
      { $set: { estado: 'ativo' } },
      { new: true }
    );
    if (!leilao) break;

    io.to(sala(leilao.id)).emit('aberto', { id: leilao.id });
  }
}

async function fecharExpirados(io, agora = new Date()) {
  while (true) {
    // A condição estado: 'ativo' funciona como um bloqueio atómico entre instâncias.
    const leilao = await Auction.findOneAndUpdate(
      { estado: 'ativo', terminaEm: { $lte: agora } },
      { $set: { estado: 'terminado' } },
      { new: true }
    );
    if (!leilao) break;

    io.to(sala(leilao.id)).emit('terminado', {
      id: leilao.id,
      vencedor: leilao.licitacaoAtual?.comprador || null,
      valor: leilao.licitacaoAtual?.valor ?? leilao.precoBase
    });
  }
}

async function obterOuCriarEncomenda(leilao) {
  const quantidadeStock = leilao.produto
    ? Number(leilao.quantidadeStock || Number.parseInt(leilao.quantidade, 10))
    : 0;
  const dados = {
    comprador: leilao.licitacaoAtual.comprador,
    produtor: leilao.produtor,
    linhas: [{
      ...(leilao.produto ? { produto: leilao.produto } : {}),
      nome: `Lote: ${leilao.lote}`,
      precoUnit: leilao.licitacaoAtual.valor,
      unidade: 'lote',
      quantidade: 1
    }],
    // O vencedor ainda tem de escolher o método de pagamento na área de
    // encomendas; o produtor só poderá confirmar depois desse passo.
    estado: 'pendente',
    origem: 'leilao',
    leilao: leilao._id
  };

  let stockReservado = false;
  try {
    if (leilao.produto && Number.isInteger(quantidadeStock) && quantidadeStock > 0) {
      const produto = await Product.findOneAndUpdate(
        { _id: leilao.produto, stock: { $gte: quantidadeStock } },
        { $inc: { stock: -quantidadeStock } },
        { new: true }
      );
      if (!produto) {
        throw new Error(`Stock insuficiente para concluir o leilão «${leilao.lote}»`);
      }
      stockReservado = true;
    }

    return await Order.create(dados);
  } catch (err) {
    if (stockReservado) {
      await Product.updateOne(
        { _id: leilao.produto },
        { $inc: { stock: quantidadeStock } }
      );
    }
    // O índice único resolve uma tentativa simultânea feita por outra instância.
    if (err?.code === 11000) return Order.findOne({ leilao: leilao._id });
    throw err;
  }
}

async function criarEncomendasPendentes(io) {
  while (true) {
    const leilao = await Auction.findOne({
      estado: 'terminado',
      'licitacaoAtual.comprador': { $exists: true, $ne: null },
      $or: [{ encomenda: { $exists: false } }, { encomenda: null }]
    });
    if (!leilao) break;

    const encomenda = await obterOuCriarEncomenda(leilao);
    // Só a instância que associa a encomenda envia as notificações.
    const associado = await Auction.findOneAndUpdate(
      {
        _id: leilao._id,
        $or: [{ encomenda: { $exists: false } }, { encomenda: null }]
      },
      { $set: { encomenda: encomenda._id } },
      { new: true }
    );
    if (!associado) continue;

    const notificacao = {
      id: leilao.id,
      lote: leilao.lote,
      valor: leilao.licitacaoAtual.valor,
      encomenda: encomenda._id
    };
    io.to(`user:${leilao.licitacaoAtual.comprador}`).emit('leilao-ganho', notificacao);
    io.to(`user:${leilao.produtor}`).emit('leilao-terminado', {
      ...notificacao,
      vencedor: leilao.licitacaoAtual.comprador
    });
  }
}

function iniciarCicloLeiloes(io, intervaloMs = 2000) {
  let emExecucao = false;

  const executar = async () => {
    if (emExecucao) return;
    emExecucao = true;
    try {
      const agora = new Date();
      await abrirAgendados(io, agora);
      await fecharExpirados(io, agora);
      await criarEncomendasPendentes(io);
    } catch (err) {
      console.error('Erro no ciclo dos leilões:', err);
    } finally {
      emExecucao = false;
    }
  };

  executar();
  const temporizador = setInterval(executar, intervaloMs);
  return () => clearInterval(temporizador);
}

module.exports = {
  iniciarCicloLeiloes,
  abrirAgendados,
  fecharExpirados,
  criarEncomendasPendentes
};
