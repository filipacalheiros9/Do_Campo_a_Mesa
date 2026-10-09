// Leilão em direto. As licitações ficam numa coleção própria (Bid): podem ser centenas.
const { Schema, model, Types } = require('mongoose');

const ESTADOS = ['agendado', 'ativo', 'terminado'];

const licitacaoAtualSchema = new Schema({
  valor: { type: Number, required: true, min: 0 },
  comprador: { type: Types.ObjectId, ref: 'User' },
  nome: { type: String, trim: true, maxlength: 100 },
  em: Date
}, { _id: false });

const auctionSchema = new Schema({
  produtor: { type: Types.ObjectId, ref: 'User', required: true },
  produto: { type: Types.ObjectId, ref: 'Product' },
  lote: { type: String, required: true, trim: true, maxlength: 150 },
  descricao: { type: String, trim: true, maxlength: 1000 },
  quantidade: { type: String, trim: true },
  precoBase: { type: Number, required: true, min: 0 },
  incremento: { type: Number, required: true, min: 0.01 },
  // Começa com valor = precoBase; a 1.ª licitação tem de ser >= precoBase + incremento
  licitacaoAtual: { type: licitacaoAtualSchema, required: true },
  iniciaEm: { type: Date, required: true },
  terminaEm: {
    type: Date,
    required: true,
    validate: {
      validator(fim) { return !this.iniciaEm || fim > this.iniciaEm; },
      message: 'A data de fim deve ser posterior à data de início'
    }
  },
  numLicitacoes: {
    type: Number,
    default: 0,
    min: 0,
    validate: { validator: Number.isInteger, message: 'O número de licitações deve ser inteiro' }
  },
  estado: { type: String, enum: ESTADOS, default: 'agendado', required: true },
  // Preenchida no Passo 7 quando o leilão termina com vencedor.
  encomenda: { type: Types.ObjectId, ref: 'Order' }
}, { timestamps: true });

// Um leilão novo começa no preço base até existir a primeira licitação.
auctionSchema.pre('validate', function preencherValorAtual() {
  if (!this.licitacaoAtual) this.licitacaoAtual = { valor: this.precoBase };
  else if (this.licitacaoAtual.valor == null) this.licitacaoAtual.valor = this.precoBase;
});

auctionSchema.index({ estado: 1, iniciaEm: 1 });
auctionSchema.index({ estado: 1, terminaEm: 1 });
auctionSchema.index({ produtor: 1, createdAt: -1 });

auctionSchema.statics.ESTADOS = ESTADOS;

module.exports = model('Auction', auctionSchema);
