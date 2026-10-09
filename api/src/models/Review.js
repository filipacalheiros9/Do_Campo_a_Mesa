// Coleção própria: as avaliações crescem sem limite e são consultadas e moderadas
// separadamente dos produtos, produtores e encomendas.
const { Schema, model, Types } = require('mongoose');

const reviewSchema = new Schema({
  autor: { type: Types.ObjectId, ref: 'User', required: true },
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  // Opcional para permitir avaliar apenas o produtor; quando existe referencia Product.
  produto: { type: Types.ObjectId, ref: 'Product' },
  encomenda: { type: Types.ObjectId, ref: 'Order', required: true },
  classificacao: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
    validate: { validator: Number.isInteger, message: 'A classificação deve ser um número inteiro' }
  },
  comentario: { type: String, trim: true, maxlength: 1000 },
  denuncias: { type: Number, default: 0, min: 0 },
  denunciantes: { type: [{ type: Types.ObjectId, ref: 'User' }], default: [] },
  visivel: { type: Boolean, default: true }
}, { timestamps: true });

// Um comprador só pode avaliar uma vez o mesmo produto na mesma encomenda.
reviewSchema.index({ autor: 1, encomenda: 1, produto: 1 }, { unique: true });
reviewSchema.index({ produtor: 1, visivel: 1, createdAt: -1 });
reviewSchema.index({ produto: 1, visivel: 1, createdAt: -1 });
reviewSchema.index({ denuncias: -1, createdAt: -1 });

module.exports = model('Review', reviewSchema);
