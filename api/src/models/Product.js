const { Schema, model, Types } = require('mongoose');

const CATEGORIAS = ['Hortícolas', 'Fruta', 'Mel', 'Vinho', 'Queijo', 'Padaria', 'Outros'];
const EPOCAS = ['Primavera', 'Verão', 'Outono', 'Inverno'];

const productSchema = new Schema({
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  nome: { type: String, required: true, trim: true },
  categoria: {
    type: String,
    enum: CATEGORIAS,
    required: true
  },
  preco: { type: Number, required: true, min: 0 },
  unidade: { type: String, required: true, trim: true, default: 'kg' },
  stock: {
    type: Number,
    default: 0,
    min: 0,
    validate: { validator: Number.isInteger, message: 'O stock deve ser um número inteiro' }
  },
  biologico: { type: Boolean, default: false },
  epocas: {
    type: [{ type: String, enum: EPOCAS }],
    default: []
  },
  imagemUrl: { type: String, trim: true } // Passo 8: URL da imagem no storage da Cloud
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Campo calculado, sem ocupar espaço no MongoDB.
productSchema.virtual('disponivel').get(function disponivel() {
  return this.stock > 0;
});

// Consultas do catálogo e da página pública do produtor.
productSchema.index({ produtor: 1, nome: 1 });
productSchema.index({ categoria: 1, biologico: 1, preco: 1 });
productSchema.index({ epocas: 1 });
productSchema.index({ nome: 1 });
productSchema.index({ createdAt: -1 });

productSchema.statics.CATEGORIAS = CATEGORIAS;
productSchema.statics.EPOCAS = EPOCAS;

module.exports = model('Product', productSchema);
