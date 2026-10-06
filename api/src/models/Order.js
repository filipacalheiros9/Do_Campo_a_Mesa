// Encomenda: as LINHAS são embebidas (lidas sempre com a encomenda);
// comprador e produtor são REFERENCIADOS.
const { Schema, model, Types } = require('mongoose');

const ESTADOS = ['pendente', 'confirmada', 'pronta', 'entregue'];

const orderSchema = new Schema({
  comprador: { type: Types.ObjectId, ref: 'User', required: true },
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  linhas: [{
    produto: { type: Types.ObjectId, ref: 'Product', required: true },
    nome: { type: String, required: true },      // cópia do nome no momento da compra
    precoUnit: { type: Number, required: true, min: 0 }, // cópia do preço no momento da compra
    unidade: { type: String, required: true },   // cópia da unidade no momento da compra
    quantidade: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'A quantidade deve ser um número inteiro' }
    }
  }],
  estado: { type: String, enum: ESTADOS, default: 'pendente' },
  entrega: {
    tipo: { type: String, enum: ['levantamento', 'entrega'], default: 'levantamento' },
    morada: String
  }
  // TODO (Passo 4): total calculado? histórico de mudanças de estado?
}, { timestamps: true });

orderSchema.statics.ESTADOS = ESTADOS;

module.exports = model('Order', orderSchema);
