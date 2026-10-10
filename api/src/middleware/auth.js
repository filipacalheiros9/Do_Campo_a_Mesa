// Passo 6: autenticação por JWT + controlo de acesso por papel.
// Uso: router.post('/', auth('produtor'), handler)   -> só produtores
//      router.get('/', auth(), handler)              -> qualquer utilizador autenticado
const jwt = require('jsonwebtoken');

module.exports = (...papeis) => (req, res, next) => {
  // O formato aceite é sempre: Authorization: Bearer <token>.
  const correspondencia = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i);
  const token = correspondencia?.[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token inválido ou em falta' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, papel, nome }
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou em falta' });
  }
  if (papeis.length && !papeis.includes(req.user.papel)) {
    return res.status(403).json({ erro: 'Sem permissão' });
  }
  next();
};
