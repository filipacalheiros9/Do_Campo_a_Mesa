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
const { geocodificarCodigoPostal } = require('../services/geocodificacao');

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// PATCH /api/producers/me -> atualiza a página pública do produtor autenticado.
router.patch('/me', auth('produtor'), a(async (req, res) => {
  const permitidos = ['nomeExploracao', 'descricao', 'localidade', 'codigoPostal'];
  const alteracoes = Object.fromEntries(
    permitidos
      .filter((campo) => req.body?.[campo] !== undefined)
      .map((campo) => [`produtor.${campo}`, req.body[campo]])
  );

  const enderecoAlterado = req.body?.codigoPostal !== undefined || req.body?.localidade !== undefined;
  if (enderecoAlterado && typeof req.body?.codigoPostal === 'string') {
    const localizacao = await geocodificarCodigoPostal(
      req.body.codigoPostal,
      req.body.localidade
    );
    if (localizacao) alteracoes['produtor.localizacao'] = localizacao;
  }

  const atualizacao = { $set: alteracoes };
  if (enderecoAlterado && !alteracoes['produtor.localizacao']) {
    atualizacao.$unset = { 'produtor.localizacao': 1 };
  }

  const produtor = await User.findOneAndUpdate(
    { _id: req.user.id, papel: 'produtor' },
    atualizacao,
    { new: true, runValidators: true }
  ).select('nome email produtor');
  if (!produtor) throw erro(404, 'Produtor não encontrado');
  res.json(produtor);
}));

// GET /api/producers/me/estatisticas -> indicadores do produtor autenticado.
router.get('/me/estatisticas', auth('produtor'), a(async (req, res) => {
  const [produtos, encomendas, leiloes, vendas, avaliacoes, stockBaixo] = await Promise.all([
    Product.countDocuments({ produtor: req.user.id }),
    Order.countDocuments({ produtor: req.user.id }),
    Auction.countDocuments({ produtor: req.user.id }),
    Order.find({ produtor: req.user.id, estado: 'entregue' }).select('total'),
    Review.find({ produtor: req.user.id, visivel: { $ne: false } }).select('classificacao'),
    Product.find({ produtor: req.user.id, stock: { $lte: 5 } })
      .select('nome stock unidade imagemUrl')
      .sort({ stock: 1, nome: 1 })
  ]);

  const totalVendas = vendas.reduce((total, encomenda) => total + encomenda.total, 0);
  const avaliacaoMedia = avaliacoes.length
    ? avaliacoes.reduce((total, avaliacao) => total + avaliacao.classificacao, 0) / avaliacoes.length
    : null;

  res.json({
    produtos,
    encomendas,
    leiloes,
    totalVendas,
    avaliacaoMedia,
    totalAvaliacoes: avaliacoes.length,
    stockBaixo
  });
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

  // Perfis criados antes do código postal recebem as coordenadas na primeira consulta.
  if (!produtor.produtor?.localizacao && produtor.produtor?.codigoPostal) {
    const localizacao = await geocodificarCodigoPostal(
      produtor.produtor.codigoPostal,
      produtor.produtor.localidade
    );
    if (localizacao) {
      produtor.produtor.localizacao = localizacao;
      await User.updateOne(
        { _id: produtor._id },
        { $set: { 'produtor.localizacao': localizacao } }
      );
    }
  }

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
