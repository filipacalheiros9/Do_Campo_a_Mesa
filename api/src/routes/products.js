// Passo 3: recurso /api/products
const router = require('express').Router();
const multer = require('multer');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');
const produtorValidado = require('../middleware/produtorValidado');
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

// GET /api/products?q=&categoria=&precoMin=&precoMax=&bio=&epoca=&produtor=&ordenar=
router.get('/', a(async (req, res) => {
  const { q, categoria, precoMin, precoMax, bio, epoca, produtor, localidade, ordenar } = req.query;
  const filtro = {};

  if (q) filtro.nome = { $regex: escaparRegex(String(q).trim()), $options: 'i' };
  if (categoria && categoria !== 'Todos') filtro.categoria = categoria;

  const minimo = precoMin === undefined || precoMin === '' ? null : Number(precoMin);
  const maximo = precoMax === undefined || precoMax === '' ? null : Number(precoMax);
  if ((minimo !== null && (!Number.isFinite(minimo) || minimo < 0))
      || (maximo !== null && (!Number.isFinite(maximo) || maximo < 0))) {
    throw erro(400, 'Os preços mínimo e máximo devem ser números não negativos');
  }
  if (minimo !== null && maximo !== null && minimo > maximo) {
    throw erro(400, 'O preço mínimo não pode ser superior ao preço máximo');
  }
  if (minimo !== null || maximo !== null) {
    filtro.preco = {
      ...(minimo !== null ? { $gte: minimo } : {}),
      ...(maximo !== null ? { $lte: maximo } : {})
    };
  }

  if (bio === 'true') filtro.biologico = true;
  if (bio === 'false') filtro.biologico = false;
  if (epoca) filtro.epocas = { $in: [epoca] };
  if (localidade) {
    const filtroProdutores = {
      papel: 'produtor',
      'produtor.validado': true,
      'produtor.localidade': {
        $regex: escaparRegex(String(localidade).trim()),
        $options: 'i'
      }
    };
    if (produtor) filtroProdutores._id = produtor;

    const produtores = await User.find(filtroProdutores).select('_id');
    filtro.produtor = { $in: produtores.map((item) => item._id) };
  } else if (produtor) {
    filtro.produtor = produtor;
  }

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
router.post('/', auth('produtor'), produtorValidado, a(async (req, res) => {
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
