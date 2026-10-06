// Passo 3: recurso /api/products
const router = require('express').Router();
const multer = require('multer');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');
const { guardarImagem } = require('../services/imagens');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const ORDENACAO = {
  recentes: { createdAt: -1 },
  preco_asc: { preco: 1 },
  preco_desc: { preco: -1 },
  nome: { nome: 1 }
};

const CAMPOS_EDITAVEIS = [
  'nome', 'categoria', 'preco', 'unidade', 'stock', 'biologico', 'epocas', 'imagemUrl'
];

const selecionarCampos = (corpo = {}) => Object.fromEntries(
  CAMPOS_EDITAVEIS
    .filter((campo) => corpo[campo] !== undefined)
    .map((campo) => [campo, corpo[campo]])
);

const confirmarDono = (produto, utilizadorId) => {
  if (produto.produtor.toString() !== String(utilizadorId)) {
    throw erro(403, 'Só o produtor dono pode alterar este produto');
  }
};

// Impede que caracteres como (, *, + ou [ sejam interpretados como uma expressão regular.
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products?q=&categoria=&precoMax=&bio=&epoca=&produtor=&ordenar=
router.get('/', a(async (req, res) => {
  const { q, categoria, precoMax, bio, epoca, produtor, ordenar } = req.query;
  const filtro = {};

  if (q) filtro.nome = { $regex: escaparRegex(String(q).trim()), $options: 'i' };
  if (categoria && categoria !== 'Todos') filtro.categoria = categoria;
  if (precoMax) filtro.preco = { $lte: Number(precoMax) };
  if (bio === 'true') filtro.biologico = true;
  if (epoca) filtro.epocas = { $in: [epoca] };
  if (produtor) filtro.produtor = produtor;

  const lista = await Product.find(filtro)
    .sort(ORDENACAO[ordenar] || ORDENACAO.recentes)
    .populate('produtor', 'nome produtor.localidade produtor.nomeExploracao');

  res.json(lista);
}));

// GET /api/products/:id  -> 200 | 404
router.get('/:id', a(async (req, res) => {
  const produto = await Product.findById(req.params.id)
    .populate('produtor', 'nome produtor.localidade produtor.nomeExploracao');

  if (!produto) throw erro(404, 'Produto não encontrado');
  res.json(produto);
}));

// POST /api/products  (produtor)  -> 201 + Location
router.post('/', auth('produtor'), a(async (req, res) => {
  const produto = await Product.create({
    ...selecionarCampos(req.body),
    produtor: req.user.id
  });

  res.location(`/api/products/${produto.id}`).status(201).json(produto);
}));

// PUT /api/products/:id  (produtor dono)  -> 200 | 404
router.put('/:id', auth('produtor'), a(async (req, res) => {
  const produto = await Product.findById(req.params.id);
  if (!produto) throw erro(404, 'Produto não encontrado');

  confirmarDono(produto, req.user.id);
  produto.set(selecionarCampos(req.body));
  await produto.save();
  await produto.populate('produtor', 'nome produtor.localidade produtor.nomeExploracao');

  res.json(produto);
}));

// DELETE /api/products/:id  (produtor dono)  -> 204 | 404
router.delete('/:id', auth('produtor'), a(async (req, res) => {
  const produto = await Product.findById(req.params.id);
  if (!produto) throw erro(404, 'Produto não encontrado');

  confirmarDono(produto, req.user.id);
  await produto.deleteOne();

  res.status(204).end();
}));

// POST /api/products/:id/imagem  (multipart, campo "imagem")  -> 200 { imagemUrl }
router.post('/:id/imagem', auth('produtor'), upload.single('imagem'), a(async (req, res) => {
  const produto = await Product.findById(req.params.id);
  if (!produto) throw erro(404, 'Produto não encontrado');
  confirmarDono(produto, req.user.id);

  produto.imagemUrl = await guardarImagem(req.file);
  await produto.save();
  res.json({ imagemUrl: produto.imagemUrl });
}));

module.exports = router;
