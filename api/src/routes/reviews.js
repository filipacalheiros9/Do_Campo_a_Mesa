// Avaliações de produtores e produtos após uma encomenda entregue.
const router = require('express').Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');

// POST /api/reviews  (comprador, só após encomenda entregue)  -> 201
router.post('/', auth('comprador'), a(async (req, res) => {
  const { encomenda: encomendaId, produto: produtoId, comentario } = req.body || {};
  const classificacao = Number(req.body?.classificacao);
  if (!encomendaId) throw erro(400, 'A encomenda é obrigatória');
  if (!Number.isInteger(classificacao) || classificacao < 1 || classificacao > 5) {
    throw erro(400, 'A classificação deve ser um número inteiro entre 1 e 5');
  }

  const encomenda = await Order.findById(encomendaId);
  if (!encomenda) throw erro(404, 'Encomenda não encontrada');
  if (encomenda.comprador.toString() !== String(req.user.id)) {
    throw erro(403, 'Só o comprador da encomenda pode avaliá-la');
  }
  if (encomenda.estado !== 'entregue') {
    throw erro(409, 'A encomenda só pode ser avaliada depois de entregue');
  }
  if (produtoId && !encomenda.linhas.some((linha) => linha.produto?.toString() === String(produtoId))) {
    throw erro(400, 'O produto não pertence a esta encomenda');
  }

  const duplicada = await Review.exists({
    autor: req.user.id,
    encomenda: encomenda._id,
    produto: produtoId || null
  });
  if (duplicada) throw erro(409, 'Esta avaliação já foi registada');

  const avaliacao = await Review.create({
    autor: req.user.id,
    produtor: encomenda.produtor,
    produto: produtoId || undefined,
    encomenda: encomenda._id,
    classificacao,
    comentario: typeof comentario === 'string' ? comentario.trim() : undefined
  });

  res.location(`/api/reviews/${avaliacao.id}`).status(201).json(avaliacao);
}));

// GET /api/reviews?produtor=&produto=  -> 200 [avaliações visíveis]
router.get('/', a(async (req, res) => {
  // Inclui avaliações visíveis e documentos antigos sem o campo; exclui apenas visivel=false.
  const filtro = { visivel: { $ne: false } };
  if (req.query.produtor) filtro.produtor = req.query.produtor;
  if (req.query.produto) filtro.produto = req.query.produto;

  const avaliacoes = await Review.find(filtro)
    .sort({ createdAt: -1 })
    .populate('autor', 'nome')
    .populate('produtor', 'nome produtor.nomeExploracao')
    .populate('produto', 'nome');
  res.json(avaliacoes);
}));

// POST /api/reviews/:id/denuncia  -> 204
router.post('/:id/denuncia', auth(), a(async (req, res) => {
  const avaliacao = await Review.findById(req.params.id);
  if (!avaliacao || !avaliacao.visivel) throw erro(404, 'Avaliação não encontrada');

  // A denúncia é idempotente: o mesmo utilizador não aumenta o contador várias vezes.
  if (!avaliacao.denunciantes.some((id) => id.toString() === String(req.user.id))) {
    avaliacao.denunciantes.push(req.user.id);
    avaliacao.denuncias = avaliacao.denunciantes.length;
    await avaliacao.save();
  }

  res.status(204).end();
}));

module.exports = router;
