// TODO (Passo 4): decidir se as avaliações ficam embebidas no produto/produtor
// ou numa coleção própria, e justificar a decisão no relatório.
const { Schema, model, Types } = require('mongoose');

const reviewSchema = new Schema({
  autor: { type: Types.ObjectId, ref: 'User', required: true },
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  produto: { type: Types.ObjectId, ref: 'Product' },
  encomenda: { type: Types.ObjectId, ref: 'Order' },
  classificacao: { type: Number, min: 1, max: 5, required: true },
  comentario: String,
  denuncias: { type: Number, default: 0 },
  denunciantes: [{ type: Types.ObjectId, ref: 'User' }],
  visivel: { type: Boolean, default: true }
}, { timestamps: true });

// Um comprador só pode avaliar uma vez o mesmo produto na mesma encomenda.
reviewSchema.index({ autor: 1, encomenda: 1, produto: 1 }, { unique: true });

module.exports = model('Review', reviewSchema);
