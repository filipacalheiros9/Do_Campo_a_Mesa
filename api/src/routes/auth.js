// Registo, autenticação e consulta da sessão atual.
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const a = require('../utils/async');
const erro = require('../utils/erro');

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
        || typeof produtor.localidade !== 'string' || !produtor.localidade.trim())) {
    throw erro(400, 'Nome da exploração e localidade são obrigatórios para produtores');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const novo = await User.create({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    papel,
    ...(papel === 'produtor' ? {
      produtor: {
        nomeExploracao: produtor.nomeExploracao.trim(),
        localidade: produtor.localidade.trim(),
        descricao: produtor.descricao?.trim(),
        localizacao: produtor.localizacao,
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
    throw erro(401, 'Email ou password incorretos');
  }
  if (utilizador.papel === 'produtor' && !utilizador.produtor?.validado) {
    throw erro(403, 'O registo do produtor ainda aguarda validação');
  }

  const token = jwt.sign(
    { id: utilizador.id, papel: utilizador.papel },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );

  res.json({ token, utilizador: utilizador.publico() });
}));

// GET /api/auth/eu  -> 200 dados do utilizador autenticado
router.get('/eu', auth(), a(async (req, res) => {
  const utilizador = await User.findById(req.user.id);
  if (!utilizador) throw erro(404, 'Utilizador não encontrado');
  res.json(utilizador.publico());
}));

module.exports = router;
