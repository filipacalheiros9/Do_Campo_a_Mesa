// Encaminha os erros dos handlers assíncronos para o errorHandler do Express.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
