const { Schema, model, Types } = require('mongoose');

const bidSchema = new Schema({
  leilao: { type: Types.ObjectId, ref: 'Auction', required: true },
  comprador: { type: Types.ObjectId, ref: 'User', required: true },
  // Cópia do nome para mostrar o histórico mesmo que o utilizador o altere.
  nome: { type: String, required: true, trim: true, maxlength: 100 },
  valor: { type: Number, required: true, min: 0.01 }
}, { timestamps: true });

// A ordem descendente permite obter rapidamente as licitações mais recentes.
bidSchema.index({ leilao: 1, createdAt: -1 });
bidSchema.index({ comprador: 1, createdAt: -1 });

module.exports = model('Bid', bidSchema);
