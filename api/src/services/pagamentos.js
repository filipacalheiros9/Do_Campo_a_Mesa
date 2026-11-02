// Simulador académico: valida apenas o método e gera uma referência interna.
// Os dados preenchidos no browser nunca chegam à API; apenas o método é processado.
const crypto = require('crypto');

const METODOS = ['cartao', 'mbway'];

function metodoValido(metodo) {
  return METODOS.includes(metodo);
}

function criarPagamentoPago(metodo, agora = new Date()) {
  if (!metodoValido(metodo)) {
    throw new TypeError('Método de pagamento inválido');
  }

  const data = agora.toISOString().slice(0, 10).replaceAll('-', '');
  const sufixo = crypto.randomBytes(4).toString('hex').toUpperCase();
  return {
    estado: 'pago',
    metodo,
    referencia: `PAG-${data}-${sufixo}`,
    pagoEm: agora
  };
}

module.exports = { METODOS, metodoValido, criarPagamentoPago };
