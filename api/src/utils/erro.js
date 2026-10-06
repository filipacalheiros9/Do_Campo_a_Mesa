// Cria um erro com código HTTP para ser tratado num único sítio.
module.exports = (status, mensagem) => Object.assign(new Error(mensagem), { status });
