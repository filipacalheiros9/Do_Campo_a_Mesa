// Painel do administrador.
const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Auction = require('../models/Auction');
const Bid = require('../models/Bid');
const Review = require('../models/Review');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');

router.use(auth('admin'));

// GET /api/admin/servicos -> estado técnico observado pela própria API.
router.get('/servicos', a(async (req, res) => {
  const io = req.app.get('io');
  const mongoLigado = mongoose.connection.readyState === 1;
  const armazenamentoCloud = Boolean(process.env.STORAGE_CONN);

  res.json([
    { id: 'api', nome: 'API REST', operacional: true, detalhe: 'Node.js e Express' },
    {
      id: 'socket',
      nome: 'Servidor de sockets',
      operacional: Boolean(io),
      detalhe: io ? `${io.engine.clientsCount} ligações ativas` : 'Socket.IO indisponível'
    },
    {
      id: 'mongo',
      nome: 'MongoDB',
      operacional: mongoLigado,
      detalhe: mongoLigado ? 'Base de dados ligada' : 'Sem ligação à base de dados'
    },
    {
      id: 'imagens',
      nome: 'Armazenamento de imagens',
      operacional: true,
      detalhe: armazenamentoCloud ? 'Azure Blob Storage configurado' : 'Armazenamento local de desenvolvimento'
    },
    { id: 'swagger', nome: 'Documentação da API', operacional: true, detalhe: 'Swagger UI em /api-docs' }
  ]);
}));

// GET /api/admin/estatisticas  -> 200
router.get('/estatisticas', a(async (req, res) => {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  const [utilizadores, produtores, encomendasHoje, leiloesAtivos] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ papel: 'produtor' }),
    Order.countDocuments({ createdAt: { $gte: inicioHoje } }),
    Auction.countDocuments({ estado: 'ativo', terminaEm: { $gt: new Date() } })
  ]);

  res.json({ utilizadores, produtores, encomendasHoje, leiloesAtivos });
}));

// GET /api/admin/produtores/pendentes  -> 200 [produtores por validar]
router.get('/produtores/pendentes', a(async (req, res) => {
  const produtores = await User.find({
    papel: 'produtor',
    'produtor.validado': false
  }).select('nome email produtor createdAt').sort({ createdAt: 1 });
  res.json(produtores);
}));

// PATCH /api/admin/produtores/:id/validacao  { aprovado: true|false }  -> 200
router.patch('/produtores/:id/validacao', a(async (req, res) => {
  if (typeof req.body?.aprovado !== 'boolean') {
    throw erro(400, 'O campo aprovado deve ser verdadeiro ou falso');
  }

  const produtor = await User.findOneAndUpdate(
    { _id: req.params.id, papel: 'produtor' },
    { $set: { 'produtor.validado': req.body.aprovado } },
    { new: true, runValidators: true }
  ).select('nome email produtor');
  if (!produtor) throw erro(404, 'Produtor não encontrado');

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${produtor._id}`).emit('conta-validada', {
      aprovado: req.body.aprovado
    });
  }

  res.json(produtor);
}));

// GET /api/admin/reviews/denunciadas  -> 200
router.get('/reviews/denunciadas', a(async (req, res) => {
  const avaliacoes = await Review.find({ denuncias: { $gt: 0 } })
    .sort({ denuncias: -1, createdAt: -1 })
    .populate('autor', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao')
    .populate('produto', 'nome');
  res.json(avaliacoes);
}));

// Listas globais consumidas pelo backoffice Laravel.
router.get('/utilizadores', a(async (req, res) => {
  const utilizadores = await User.find()
    .select('nome email papel produtor createdAt')
    .sort({ createdAt: -1 });
  res.json(utilizadores);
}));

// DELETE /api/admin/utilizadores/:id -> elimina apenas contas sem atividade associada.
router.delete('/utilizadores/:id', a(async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) {
    throw erro(409, 'Não pode eliminar a conta de administrador com sessão iniciada');
  }

  const utilizador = await User.findById(req.params.id).select('_id nome papel');
  if (!utilizador) throw erro(404, 'Utilizador não encontrado');

  const [produtos, encomendas, leiloes, licitacoes, avaliacoes] = await Promise.all([
    Product.countDocuments({ produtor: utilizador._id }),
    Order.countDocuments({
      $or: [{ comprador: utilizador._id }, { produtor: utilizador._id }]
    }),
    Auction.countDocuments({
      $or: [
        { produtor: utilizador._id },
        { 'licitacaoAtual.comprador': utilizador._id }
      ]
    }),
    Bid.countDocuments({ comprador: utilizador._id }),
    Review.countDocuments({
      $or: [{ autor: utilizador._id }, { produtor: utilizador._id }]
    })
  ]);

  const totalAssociacoes = produtos + encomendas + leiloes + licitacoes + avaliacoes;
  if (totalAssociacoes > 0) {
    throw erro(409, 'A conta tem produtos, encomendas, leilões, licitações ou avaliações associados e não pode ser eliminada');
  }

  await Promise.all([
    Review.updateMany(
      { denunciantes: utilizador._id },
      { $pull: { denunciantes: utilizador._id } }
    ),
    User.deleteOne({ _id: utilizador._id })
  ]);

  res.status(204).end();
}));

router.get('/encomendas', a(async (req, res) => {
  const encomendas = await Order.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('comprador', 'nome email')
    .populate('produtor', 'nome produtor.nomeExploracao');
  res.json(encomendas);
}));

router.get('/leiloes', a(async (req, res) => {
  const leiloes = await Auction.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('produtor', 'nome produtor.nomeExploracao')
    .populate('produto', 'nome');
  res.json(leiloes);
}));

// PATCH /api/admin/reviews/:id  { visivel: false }  -> 200
router.patch('/reviews/:id', a(async (req, res) => {
  if (typeof req.body?.visivel !== 'boolean') {
    throw erro(400, 'O campo visivel deve ser verdadeiro ou falso');
  }

  const avaliacao = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { visivel: req.body.visivel } },
    { new: true, runValidators: true }
  );
  if (!avaliacao) throw erro(404, 'Avaliação não encontrada');
  res.json(avaliacao);
}));

module.exports = router;
