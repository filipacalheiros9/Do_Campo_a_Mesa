// Páginas públicas dos produtores.
const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Auction = require('../models/Auction');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// PATCH /api/producers/me -> atualiza a página pública do produtor autenticado.
router.patch('/me', auth('produtor'), a(async (req, res) => {
  const permitidos = ['nomeExploracao', 'descricao', 'localidade', 'localizacao'];
  const alteracoes = Object.fromEntries(
    permitidos
      .filter((campo) => req.body?.[campo] !== undefined)
      .map((campo) => [`produtor.${campo}`, req.body[campo]])
  );

  const produtor = await User.findOneAndUpdate(
    { _id: req.user.id, papel: 'produtor' },
    { $set: alteracoes },
    { new: true, runValidators: true }
  ).select('nome email produtor');
  if (!produtor) throw erro(404, 'Produtor não encontrado');
  res.json(produtor);
}));

// GET /api/producers/me/estatisticas -> indicadores do produtor autenticado.
router.get('/me/estatisticas', auth('produtor'), a(async (req, res) => {
  const [produtos, encomendas, leiloes, vendas] = await Promise.all([
    Product.countDocuments({ produtor: req.user.id }),
    Order.countDocuments({ produtor: req.user.id }),
    Auction.countDocuments({ produtor: req.user.id }),
    Order.find({ produtor: req.user.id, estado: 'entregue' })
  ]);

  const totalVendas = vendas.reduce((total, encomenda) => total + encomenda.total, 0);
  res.json({ produtos, encomendas, leiloes, totalVendas });
}));

// GET /api/producers?localidade=  -> 200 [produtores validados]
router.get('/', a(async (req, res) => {
  const filtro = { papel: 'produtor', 'produtor.validado': true };
  if (req.query.localidade) {
    filtro['produtor.localidade'] = {
      $regex: escaparRegex(String(req.query.localidade).trim()),
      $options: 'i'
    };
  }

  const produtores = await User.find(filtro)
    .select('nome produtor')
    .sort({ nome: 1 });
  res.json(produtores);
}));

// GET /api/producers/:id  -> 200 { produtor, produtos, avaliacaoMedia }
router.get('/:id', a(async (req, res) => {
  const produtor = await User.findOne({
    _id: req.params.id,
    papel: 'produtor',
    'produtor.validado': true
  }).select('nome produtor');
  if (!produtor) throw erro(404, 'Produtor não encontrado');

  const [produtos, resumo] = await Promise.all([
    Product.find({ produtor: produtor._id }).sort({ nome: 1 }),
    Review.aggregate([
      { $match: { produtor: produtor._id, visivel: true } },
      { $group: { _id: null, media: { $avg: '$classificacao' }, total: { $sum: 1 } } }
    ])
  ]);

  res.json({
    produtor,
    produtos,
    avaliacaoMedia: resumo[0]?.media ?? null,
    totalAvaliacoes: resumo[0]?.total ?? 0
  });
}));

module.exports = router;
