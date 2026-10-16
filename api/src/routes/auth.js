// Registo, autenticação e consulta da sessão atual.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');
const { geocodificarCodigoPostal } = require('../services/geocodificacao');
const CODIGO_POSTAL = /^\d{4}-\d{3}$/;

const assinarToken = (utilizador) => jwt.sign(
  { id: utilizador.id, papel: utilizador.papel, nome: utilizador.nome },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
);

// POST /api/auth/registo  -> 201 { id }
router.post('/registo', a(async (req, res) => {
  const { nome, email, password, papel = 'comprador', produtor = {} } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()
      || typeof email !== 'string' || !email.trim()
      || typeof password !== 'string' || password.length < 8) {
    throw erro(400, 'Nome, email e password com pelo menos 8 caracteres são obrigatórios');
  }
  if (!['comprador', 'produtor'].includes(papel)) {
    throw erro(400, 'O papel deve ser comprador ou produtor');
  }
  if (papel === 'produtor'
      && (typeof produtor.nomeExploracao !== 'string' || !produtor.nomeExploracao.trim()
        || typeof produtor.localidade !== 'string' || !produtor.localidade.trim()
        || typeof produtor.codigoPostal !== 'string'
        || !CODIGO_POSTAL.test(produtor.codigoPostal.trim()))) {
    throw erro(400, 'Nome da exploração, localidade e código postal no formato 0000-000 são obrigatórios');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const localizacao = papel === 'produtor'
    ? await geocodificarCodigoPostal(produtor.codigoPostal, produtor.localidade)
    : null;
  const novo = await User.create({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    papel,
    ...(papel === 'produtor' ? {
      produtor: {
        nomeExploracao: produtor.nomeExploracao.trim(),
        localidade: produtor.localidade.trim(),
        codigoPostal: produtor.codigoPostal.trim(),
        descricao: produtor.descricao?.trim(),
        localizacao: localizacao || undefined,
        validado: false
      }
    } : {})
  });

  res.status(201).json({ id: novo.id });
}));

// POST /api/auth/login  -> 200 { token, utilizador }
router.post('/login', a(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw erro(400, 'Email e password são obrigatórios');

  const utilizador = await User.findOne({ email: String(email).trim().toLowerCase() })
    .select('+passwordHash');
  if (!utilizador || !(await utilizador.passwordCorresponde(password))) {
    // A mesma mensagem evita revelar se determinado email está registado.
    throw erro(401, 'Credenciais inválidas');
  }
  if (utilizador.papel === 'produtor' && !utilizador.produtor?.validado) {
    throw erro(403, 'O registo do produtor ainda aguarda validação');
  }

  const token = assinarToken(utilizador);

  res.json({ token, utilizador: utilizador.publico() });
}));

// GET /api/auth/eu  -> 200 dados do utilizador autenticado
router.get('/eu', auth(), a(async (req, res) => {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador) throw erro(404, 'Utilizador não encontrado');
  res.json(utilizador.publico());
}));

// PATCH /api/auth/eu -> atualizar os dados pessoais do comprador.
router.patch('/eu', auth('comprador'), a(async (req, res) => {
  const { nome, email } = req.body || {};
  if (typeof nome !== 'string' || !nome.trim()
      || typeof email !== 'string' || !email.trim()) {
    throw erro(400, 'Nome e email são obrigatórios');
  }

  const utilizador = await User.findById(req.user.id);
  if (!utilizador) throw erro(404, 'Utilizador não encontrado');

  utilizador.nome = nome.trim();
  utilizador.email = email.trim().toLowerCase();
  await utilizador.save();

  // O novo JWT mantém o nome usado pelos sockets sincronizado com o perfil.
  res.json({ token: assinarToken(utilizador), utilizador: utilizador.publico() });
}));

// PATCH /api/auth/password -> alterar a palavra-passe sem expor o respetivo hash.
router.patch('/password', auth(), a(async (req, res) => {
  const { passwordAtual, novaPassword } = req.body || {};
  if (typeof passwordAtual !== 'string' || typeof novaPassword !== 'string'
      || novaPassword.length < 8) {
    throw erro(400, 'Indique a palavra-passe atual e uma nova com pelo menos 8 caracteres');
  }

  const utilizador = await User.findById(req.user.id).select('+passwordHash');
  if (!utilizador || !(await utilizador.passwordCorresponde(passwordAtual))) {
    throw erro(401, 'A palavra-passe atual está incorreta');
  }

  utilizador.passwordHash = await bcrypt.hash(novaPassword, 12);
  await utilizador.save();
  res.status(204).end();
}));

module.exports = router;
