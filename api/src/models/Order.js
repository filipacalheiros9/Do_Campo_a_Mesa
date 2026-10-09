// Encomenda: as LINHAS são embebidas (lidas sempre com a encomenda);
// comprador e produtor são REFERENCIADOS.
const { Schema, model, Types } = require('mongoose');

const ESTADOS = ['pendente', 'confirmada', 'pronta', 'entregue'];

// Cada linha é guardada dentro da encomenda e conserva os dados comerciais da compra.
const linhaSchema = new Schema({
  produto: { type: Types.ObjectId, ref: 'Product', required: true },
  nome: { type: String, required: true, trim: true },
  precoUnit: { type: Number, required: true, min: 0 },
  unidade: { type: String, required: true, trim: true },
  quantidade: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: 'A quantidade deve ser um número inteiro' }
  }
}, { _id: false });

const orderSchema = new Schema({
  comprador: { type: Types.ObjectId, ref: 'User', required: true },
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  linhas: {
    type: [linhaSchema],
    required: true,
    validate: {
      validator: (linhas) => Array.isArray(linhas) && linhas.length > 0,
      message: 'A encomenda deve ter pelo menos uma linha'
    }
  },
  estado: { type: String, enum: ESTADOS, default: 'pendente', required: true },
  entrega: {
    tipo: { type: String, enum: ['levantamento', 'entrega'], default: 'levantamento' },
    morada: String
  },
  origem: { type: String, enum: ['loja', 'leilao'], default: 'loja', required: true },
  leilao: {
    type: Types.ObjectId,
    ref: 'Auction',
    required() { return this.origem === 'leilao'; }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// O total é calculado a partir da cópia do preço guardada em cada linha.
orderSchema.virtual('total').get(function total() {
  const valor = this.linhas.reduce(
    (soma, linha) => soma + linha.precoUnit * linha.quantidade,
    0
  );
  return Math.round(valor * 100) / 100;
});

orderSchema.methods.estadoSeguinte = function estadoSeguinte() {
  const indice = ESTADOS.indexOf(this.estado);
  return indice >= 0 ? ESTADOS[indice + 1] || null : null;
};

orderSchema.methods.podeTransitarPara = function podeTransitarPara(novoEstado) {
  return novoEstado === this.estadoSeguinte();
};

orderSchema.statics.ESTADOS = ESTADOS;

orderSchema.index({ comprador: 1, createdAt: -1 });
orderSchema.index({ produtor: 1, createdAt: -1 });
orderSchema.index({ leilao: 1 }, { sparse: true });

module.exports = model('Order', orderSchema);
