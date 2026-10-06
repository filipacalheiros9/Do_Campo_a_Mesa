// Tratamento centralizado de erros: converte erros do Mongoose em códigos HTTP
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err.name === 'ValidationError') {
    const detalhes = Object.fromEntries(
      Object.entries(err.errors).map(([campo, erroCampo]) => [campo, erroCampo.message])
    );
    return res.status(400).json({ erro: 'Dados inválidos', detalhes });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ erro: 'Identificador ou valor inválido' });
  }

  if (err.code === 11000) {
    return res.status(409).json({ erro: 'Já existe um registo com esses dados' });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ erro: err.message });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  return res.status(status).json({
    erro: status >= 500 ? 'Erro interno' : err.message
  });
};
