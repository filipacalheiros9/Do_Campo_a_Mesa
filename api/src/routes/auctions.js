// Leilões: a parte REST; as licitações em direto são tratadas pelo Socket.IO.
const router = require('express').Router();
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');

async function atualizarEstados() {
  const agora = new Date();
  await Promise.all([
    Auction.updateMany(
      { estado: 'agendado', iniciaEm: { $lte: agora }, terminaEm: { $gt: agora } },
      { $set: { estado: 'ativo' } }
    ),
    Auction.updateMany(
      { estado: { $in: ['agendado', 'ativo'] }, terminaEm: { $lt: agora } },
      { $set: { estado: 'terminado' } }
    )
  ]);
}

// GET /api/auctions?estado=ativo  -> 200 [leilões]
router.get('/', a(async (req, res) => {
  await atualizarEstados();
  const filtro = {};
  if (req.query.estado) {
    if (!Auction.ESTADOS.includes(req.query.estado)) throw erro(400, 'Estado de leilão inválido');
    filtro.estado = req.query.estado;
  }

  const leiloes = await Auction.find(filtro)
    .sort({ iniciaEm: 1 })
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade')
    .populate('produto', 'nome unidade imagemUrl');
  res.json(leiloes);
}));

// GET /api/auctions/:id  -> 200 leilão + últimas licitações
router.get('/:id', a(async (req, res) => {
  await atualizarEstados();
  const leilao = await Auction.findById(req.params.id)
    .populate('produtor', 'nome produtor.nomeExploracao produtor.localidade')
    .populate('produto', 'nome unidade imagemUrl')
    .populate('licitacaoAtual.comprador', 'nome');
  if (!leilao) throw erro(404, 'Leilão não encontrado');

  const licitacoes = await Bid.find({ leilao: leilao._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('comprador', 'nome');
  res.json({ leilao, licitacoes });
}));

// POST /api/auctions  (produtor)  -> 201
router.post('/', auth('produtor'), a(async (req, res) => {
  const { produto: produtoId, lote, descricao, quantidade, precoBase, incremento } = req.body || {};
  const inicio = req.body?.iniciaEm ? new Date(req.body.iniciaEm) : new Date();
  const duracao = Number(req.body?.duracaoMinutos ?? req.body?.duracao);
  const fimIndicado = req.body?.terminaEm ? new Date(req.body.terminaEm) : null;

  if (typeof lote !== 'string' || !lote.trim()) throw erro(400, 'A descrição do lote é obrigatória');
  if (!Number.isFinite(Number(precoBase)) || Number(precoBase) < 0) {
    throw erro(400, 'O preço base deve ser um número igual ou superior a zero');
  }
  if (!Number.isFinite(Number(incremento)) || Number(incremento) <= 0) {
    throw erro(400, 'O incremento deve ser um número positivo');
  }
  if (Number.isNaN(inicio.getTime())) throw erro(400, 'A data de início é inválida');

  let terminaEm;
  if (Number.isFinite(duracao) && duracao > 0) {
    terminaEm = new Date(inicio.getTime() + duracao * 60 * 1000);
  } else if (fimIndicado && !Number.isNaN(fimIndicado.getTime()) && fimIndicado > inicio) {
    terminaEm = fimIndicado;
  } else {
    throw erro(400, 'Indique uma duração positiva em minutos');
  }

  let produto;
  if (produtoId) {
    produto = await Product.findById(produtoId);
    if (!produto) throw erro(404, 'Produto não encontrado');
    if (produto.produtor.toString() !== String(req.user.id)) {
      throw erro(403, 'Só pode criar leilões para os seus produtos');
    }
  }

  const agora = new Date();
  const leilao = await Auction.create({
    produtor: req.user.id,
    produto: produto?._id,
    lote: lote.trim(),
    descricao: typeof descricao === 'string' ? descricao.trim() : undefined,
    quantidade,
    precoBase: Number(precoBase),
    incremento: Number(incremento),
    licitacaoAtual: { valor: Number(precoBase) },
    iniciaEm: inicio,
    terminaEm,
    estado: terminaEm <= agora ? 'terminado' : (inicio <= agora ? 'ativo' : 'agendado')
  });

  res.location(`/api/auctions/${leilao.id}`).status(201).json(leilao);
}));

// GET /api/auctions/:id/bids  -> 200 [licitações]
router.get('/:id/bids', a(async (req, res) => {
  if (!(await Auction.exists({ _id: req.params.id }))) throw erro(404, 'Leilão não encontrado');
  const licitacoes = await Bid.find({ leilao: req.params.id })
    .sort({ createdAt: -1 })
    .populate('comprador', 'nome');
  res.json(licitacoes);
}));

module.exports = router;
